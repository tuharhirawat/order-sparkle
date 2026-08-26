import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type OrderStatus = Enums<"order_status">;
export type PaymentStatus = Enums<"payment_status">;

export const ORDER_STATUSES: OrderStatus[] = [
  "PendingConfirmation",
  "Confirmed",
  "PaymentPending",
  "PaymentReceived",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_STATUSES: PaymentStatus[] = ["Unpaid", "PartiallyPaid", "Paid", "Refunded"];

export type AdminOrder = Tables<"orders"> & { order_items: Tables<"order_items">[] };

export const adminOrdersQuery = () =>
  queryOptions({
    queryKey: ["admin", "orders"],
    queryFn: async (): Promise<AdminOrder[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminOrder[];
    },
  });

export const adminCustomersQuery = () =>
  queryOptions({
    queryKey: ["admin", "customers"],
    queryFn: async (): Promise<Tables<"customers">[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const adminProductsQuery = () =>
  queryOptions({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug), product_images(*), product_variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const adminCategoriesQuery = () =>
  queryOptions({
    queryKey: ["admin", "categories"],
    queryFn: async (): Promise<Tables<"categories">[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export function statusTone(status: OrderStatus): string {
  switch (status) {
    case "Delivered":
    case "PaymentReceived":
      return "border-gold/50 bg-gold/10 text-gold";
    case "Cancelled":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "PendingConfirmation":
      return "border-border bg-secondary text-muted-foreground";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

export interface OrderItemAvailability {
  order_item_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  requested: number;
  available: number;
  tracked: boolean;
}

/** Live per-item availability for an order, computed in the database. */
export const orderAvailabilityQuery = (orderId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["admin", "order-availability", orderId],
    enabled,
    queryFn: async (): Promise<OrderItemAvailability[]> => {
      const { data, error } = await supabase.rpc("order_item_availability", { _order_id: orderId });
      if (error) throw new Error(error.message);
      return (data ?? []) as OrderItemAvailability[];
    },
  });

export const inventoryMovementsQuery = () =>
  queryOptions({
    queryKey: ["admin", "inventory-movements"],
    queryFn: async (): Promise<Tables<"inventory_movements">[]> => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
