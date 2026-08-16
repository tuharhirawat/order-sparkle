import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(20),
});

const orderRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  customer: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    line1: z.string().trim().min(6).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  items: z.array(itemSchema).min(1).max(30),
});

export type OrderRequestInput = z.infer<typeof orderRequestSchema>;

export interface OrderConfirmation {
  orderNumber: string;
  total: number;
  customerName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  note: string | null;
  items: {
    name: string;
    variantLabel: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}

/** Public endpoint: guest order requests. Prices and totals are server-derived. */
export const createOrderRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderRequestSchema.parse(input))
  .handler(async ({ data }): Promise<OrderConfirmation> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { customer, items } = data;

    // Idempotency: an identical submit returns the original order.
    const existing = await supabaseAdmin
      .from("orders")
      .select("order_number, total, ship_full_name, ship_line1, ship_city, ship_state, ship_pincode, customer_note, order_items(product_name, variant_label, quantity, unit_price, line_total)")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();

    if (existing.data) {
      const row = existing.data;
      return {
        orderNumber: row.order_number,
        total: Number(row.total),
        customerName: row.ship_full_name,
        addressLine: row.ship_line1,
        city: row.ship_city,
        state: row.ship_state,
        pincode: row.ship_pincode,
        note: row.customer_note,
        items: (row.order_items ?? []).map((i) => ({
          name: i.product_name,
          variantLabel: i.variant_label,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          lineTotal: Number(i.line_total),
        })),
      };
    }

    // Lightweight abuse guard: cap order requests per phone number.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("ship_phone", customer.phone)
      .gte("created_at", since);
    if ((recent.count ?? 0) >= 5) {
      throw new Error("Too many order requests from this number. Please try again in a few minutes.");
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, price, stock, track_stock, is_active, product_variants(id, label, price_delta, stock, is_active), product_images(url, position)")
      .in("id", productIds);
    if (productError) throw new Error("We could not verify your items. Please try again.");

    const lines = items.map((item) => {
      const product = products?.find((p) => p.id === item.productId);
      if (!product || !product.is_active) {
        throw new Error("One of the items is no longer available. Please review your bag.");
      }
      const variant = item.variantId
        ? product.product_variants.find((v) => v.id === item.variantId)
        : null;
      if (item.variantId && (!variant || !variant.is_active)) {
        throw new Error(`The selected option for ${product.name} is unavailable.`);
      }
      if (product.product_variants.some((v) => v.is_active) && !variant) {
        throw new Error(`Please choose an option for ${product.name}.`);
      }
      if (product.track_stock) {
        const stock = variant ? variant.stock : product.stock;
        if (stock < item.quantity) {
          throw new Error(`Only ${stock} left of ${product.name}. Please adjust the quantity.`);
        }
      }
      const unitPrice = Number(product.price) + Number(variant?.price_delta ?? 0);
      const image = [...product.product_images].sort((a, b) => a.position - b.position)[0];
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        name: product.name,
        sku: product.sku,
        variantLabel: variant?.label ?? null,
        unitPrice,
        quantity: item.quantity,
        lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
        imageUrl: image?.url ?? null,
      };
    });

    const subtotal = Number(lines.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(2));
    const email = customer.email ? customer.email : null;

    // Customer record (phone is the natural key until accounts arrive).
    const { data: customerRow, error: customerError } = await supabaseAdmin
      .from("customers")
      .upsert(
        { phone: customer.phone, full_name: customer.fullName, email },
        { onConflict: "phone" },
      )
      .select("id")
      .single();
    if (customerError || !customerRow) throw new Error("We could not save your details. Please try again.");

    const { data: addressRow } = await supabaseAdmin
      .from("addresses")
      .insert({
        customer_id: customerRow.id,
        line1: customer.line1,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
      })
      .select("id")
      .single();

    const { data: numberData, error: numberError } = await supabaseAdmin.rpc("next_order_number");
    if (numberError || !numberData) throw new Error("We could not create your order. Please try again.");
    const orderNumber = numberData as unknown as string;

    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerRow.id,
        address_id: addressRow?.id ?? null,
        subtotal,
        total: subtotal,
        customer_note: customer.note ? customer.note : null,
        ship_full_name: customer.fullName,
        ship_phone: customer.phone,
        ship_email: email,
        ship_line1: customer.line1,
        ship_city: customer.city,
        ship_state: customer.state,
        ship_pincode: customer.pincode,
        idempotency_key: data.idempotencyKey,
      })
      .select("id, order_number, total")
      .single();
    if (orderError || !orderRow) throw new Error("We could not create your order. Please try again.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: orderRow.id,
        product_id: l.productId,
        variant_id: l.variantId,
        product_name: l.name,
        product_sku: l.sku,
        variant_label: l.variantLabel,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
        image_url: l.imageUrl,
      })),
    );
    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", orderRow.id);
      throw new Error("We could not create your order. Please try again.");
    }

    return {
      orderNumber: orderRow.order_number,
      total: Number(orderRow.total),
      customerName: customer.fullName,
      addressLine: customer.line1,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      note: customer.note ? customer.note : null,
      items: lines.map((l) => ({
        name: l.name,
        variantLabel: l.variantLabel,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    };
  });
