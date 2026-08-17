import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MyOrderRequest {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  events: { status: string; paymentStatus: string | null; createdAt: string; note: string | null }[];
  total: number;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipLine1: string;
  note: string | null;
  items: {
    name: string;
    variantLabel: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl: string | null;
  }[];
}

/**
 * Orders a signed-in shopper may see: those placed with their verified account
 * email, or with the phone number claimed on their profile (unique per account).
 */
export const getMyOrderRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrderRequest[]> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("phone, email")
      .eq("id", context.userId)
      .maybeSingle();

    const authEmail = typeof context.claims['email'] === "string" ? (context.claims['email'] as string) : null;
    const phone = profile?.phone ?? null;

    const filters: string[] = [];
    if (authEmail) filters.push(`ship_email.eq.${authEmail}`);
    if (phone) filters.push(`ship_phone.eq.${phone}`);
    if (filters.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number, created_at, status, payment_status, total, ship_line1, ship_city, ship_state, ship_pincode, customer_note, order_items(product_name, variant_label, quantity, unit_price, line_total, image_url), order_status_events(status, payment_status, note, created_at)",
      )
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error("We could not load your order requests. Please try again.");

    return (data ?? []).map((row) => ({
      orderNumber: row.order_number,
      createdAt: row.created_at,
      status: row.status,
      paymentStatus: row.payment_status,
      events: [...(row.order_status_events ?? [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((e) => ({
          status: e.status,
          paymentStatus: e.payment_status,
          note: e.note,
          createdAt: e.created_at,
        })),
      total: Number(row.total),
      shipLine1: row.ship_line1,
      shipCity: row.ship_city,
      shipState: row.ship_state,
      shipPincode: row.ship_pincode,
      note: row.customer_note,
      items: (row.order_items ?? []).map((i) => ({
        name: i.product_name,
        variantLabel: i.variant_label,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
        imageUrl: i.image_url,
      })),
    }));
  });
