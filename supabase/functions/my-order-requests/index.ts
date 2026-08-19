import { authenticatedUser, corsHeaders, json, adminClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(request);
    const supabase = adminClient();
    const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
    const filters = [user.email ? `ship_email.eq.${user.email}` : null, profile?.phone ? `ship_phone.eq.${profile.phone}` : null].filter(Boolean);
    if (filters.length === 0) return json([]);
    const { data, error } = await supabase
      .from("orders")
      .select("order_number, created_at, status, payment_status, total, ship_line1, ship_city, ship_state, ship_pincode, customer_note, order_items(product_name, variant_label, quantity, unit_price, line_total, image_url)")
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("We could not load your order requests. Please try again.");
    return json((data ?? []).map((row) => ({ orderNumber: row.order_number, createdAt: row.created_at, status: row.status, paymentStatus: row.payment_status, total: Number(row.total), shipLine1: row.ship_line1, shipCity: row.ship_city, shipState: row.ship_state, shipPincode: row.ship_pincode, note: row.customer_note, items: (row.order_items ?? []).map((item) => ({ name: item.product_name, variantLabel: item.variant_label, quantity: item.quantity, unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total), imageUrl: item.image_url })) })));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unauthorized" }, 401);
  }
});
