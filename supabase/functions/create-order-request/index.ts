import { adminClient, corsHeaders, json } from "../_shared/supabase.ts";
import { z } from "https://esm.sh/zod@3";

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(20),
});

const orderRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  customer: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(
      /^[6-9]\d{9}$/,
      "Enter a valid 10-digit Indian mobile number",
    ),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    line1: z.string().trim().min(6).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  items: z.array(itemSchema).min(1).max(30),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await request.json();
    const result = orderRequestSchema.safeParse(body);

    if (!result.success) {
      return json(
        {
          error: "Invalid order request.",
          details: result.error.flatten(),
        },
        400,
      );
    }

    const input = result.data;
    const { customer, items } = input;
    const supabase = adminClient();
    const existing = await supabase
      .from("orders")
      .select("order_number, total, ship_full_name, ship_line1, ship_city, ship_state, ship_pincode, customer_note, order_items(product_name, variant_label, quantity, unit_price, line_total)")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing.data) return json(formatConfirmation(existing.data));

    const recent = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("ship_phone", customer.phone)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
    if ((recent.count ?? 0) >= 5) return json({ error: "Too many order requests. Please try again in a few minutes." }, 429);

    const productIds = [...new Set(items.map((item) => item.productId))];
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, sku, price, stock, track_stock, is_active, product_variants(id, label, price_delta, stock, is_active), product_images(url, position)")
      .in("id", productIds);
    if (productError || !products) throw new Error("We could not verify your items. Please try again.");

    const lines = items.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product || !product.is_active) {
        throw new Error(
          "One of the items is no longer available. Please review your bag.",
        );
      }
      const variants = product.product_variants ?? [];
      const variant = item.variantId ? variants.find((entry) => entry.id === item.variantId) : null;
      if ((item.variantId && (!variant || !variant.is_active)) || (variants.some((entry) => entry.is_active) && !variant)) {
        throw new Error(`Please choose an available option for ${product.name}.`);
      }
      const stock = variant ? variant.stock : product.stock;
      if (product.track_stock && stock < item.quantity) throw new Error(`Only ${stock} left of ${product.name}.`);
      const unitPrice = Number(product.price) + Number(variant?.price_delta ?? 0);
      const image = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
      return { productId: product.id, variantId: variant?.id ?? null, name: product.name, sku: product.sku, variantLabel: variant?.label ?? null, unitPrice, quantity: item.quantity, lineTotal: Number((unitPrice * item.quantity).toFixed(2)), imageUrl: image?.url ?? null };
    });

    const email = customer.email?.trim() || null;
    const { data: customerRow, error: customerError } = await supabase
      .from("customers")
      .upsert({ phone: customer.phone, full_name: customer.fullName.trim(), email }, { onConflict: "phone" })
      .select("id")
      .single();
    if (customerError || !customerRow) throw new Error("We could not save your details. Please try again.");
    const { data: addressRow, error: addressError } = await supabase
      .from("addresses")
      .insert({ customer_id: customerRow.id, line1: customer.line1.trim(), city: customer.city.trim(), state: customer.state.trim(), pincode: customer.pincode.trim() })
      .select("id")
      .single();
    if (addressError || !addressRow) throw new Error("We could not save your address. Please try again.");
    const { data: orderNumber, error: numberError } = await supabase.rpc("next_order_number");
    if (numberError || !orderNumber) throw new Error("We could not create your order. Please try again.");
    const total = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ order_number: orderNumber, customer_id: customerRow.id, address_id: addressRow.id, subtotal: total, total, customer_note: customer.note?.trim() || null, ship_full_name: customer.fullName.trim(), ship_phone: customer.phone, ship_email: email, ship_line1: customer.line1.trim(), ship_city: customer.city.trim(), ship_state: customer.state.trim(), ship_pincode: customer.pincode.trim(), idempotency_key: input.idempotencyKey })
      .select("id, order_number, total")
      .single();
    if (orderError || !order) throw new Error("We could not create your order. Please try again.");
    const { error: itemsError } = await supabase.from("order_items").insert(lines.map((line) => ({ order_id: order.id, product_id: line.productId, variant_id: line.variantId, product_name: line.name, product_sku: line.sku, variant_label: line.variantLabel, unit_price: line.unitPrice, quantity: line.quantity, line_total: line.lineTotal, image_url: line.imageUrl })));
    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("We could not create your order. Please try again.");
    }
    return json({ orderNumber: order.order_number, total: Number(order.total), customerName: customer.fullName.trim(), addressLine: customer.line1.trim(), city: customer.city.trim(), state: customer.state.trim(), pincode: customer.pincode.trim(), note: customer.note?.trim() || null, items: lines.map(({ name, variantLabel, quantity, unitPrice, lineTotal }) => ({ name, variantLabel, quantity, unitPrice, lineTotal })) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "We could not create your order. Please try again." }, 400);
  }
});

function formatConfirmation(row: any) {
  return { orderNumber: row.order_number, total: Number(row.total), customerName: row.ship_full_name, addressLine: row.ship_line1, city: row.ship_city, state: row.ship_state, pincode: row.ship_pincode, note: row.customer_note, items: (row.order_items ?? []).map((item: any) => ({ name: item.product_name, variantLabel: item.variant_label, quantity: item.quantity, unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total) })) };
}
