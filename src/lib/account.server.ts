import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MyOrderRequest } from "./account.types";

type Client = ReturnType<typeof createClient<Database>>;

/**
 * Validates an `Authorization: Bearer <supabase access token>` header the same
 * way `requireSupabaseAuth` does, and returns the caller identity.
 */
export async function verifyBearer(authHeader: string | null) {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase environment is not configured");

  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) headers.delete("Authorization");
        headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
        return fetch(input, { ...init, headers });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");

  const email = typeof data.claims["email"] === "string" ? (data.claims["email"] as string) : null;
  return { supabase, userId: data.claims.sub as string, email };
}

/**
 * Single source of truth for "orders this shopper may see": orders placed with
 * their verified account email, or with the phone claimed on their profile.
 */
export async function loadMyOrderRequests(
  supabase: Client,
  userId: string,
  authEmail: string | null,
): Promise<MyOrderRequest[]> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, email")
    .eq("id", userId)
    .maybeSingle();

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
}
