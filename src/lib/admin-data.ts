import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { AdminProduct, Category } from "@/DBTypes/types";
import api from "@/Services/api";

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
    queryFn: async (): Promise<AdminProduct[]> => {
      const response = await api.get<AdminProduct[]>("/Product/Admin");

      return response.data;
    },
  });

export const adminCategoryNamesQuery = () =>
  queryOptions({
    queryKey: ["admin", "category-names"],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const response = await api.get("/Product/Categories/Name");
      return response.data;
    },
  });

export const adminCategoriesQuery = () =>
  queryOptions({
    queryKey: ["admin", "categories"],
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get<Category[]>("/Product/Categories/Admin");

      return response.data;
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
