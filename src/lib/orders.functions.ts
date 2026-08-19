import { supabase } from "@/integrations/supabase/client";

export interface OrderRequestInput {
  idempotencyKey: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
    note?: string;
  };
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
  }[];
}

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

export async function createOrderRequest(input: OrderRequestInput): Promise<OrderConfirmation> {
  const { data, error } = await supabase.functions.invoke(
    "create-order-request",
    { body: input, }
  );

  if (error) throw error;
  return data as OrderConfirmation;
}