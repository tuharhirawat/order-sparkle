import { supabase } from "@/integrations/supabase/client";

export interface MyOrderRequest {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
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
export async function getMyOrderRequests(): Promise<MyOrderRequest[]> {
  const { data, error } = await supabase.functions.invoke("my-order-requests");
  if (error) throw error;
  return (data ?? []) as MyOrderRequest[];
}
