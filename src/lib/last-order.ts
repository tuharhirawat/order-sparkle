import type { CreateOrderResponse as OrderConfirmation } from "@/Types/orderTypes";

const KEY = "mamtas-last-order-v1";

/** The order already lives in the database; this is only for the confirmation screen. */
export function saveLastOrder(order: OrderConfirmation): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

export function readLastOrder(orderNumber: string): OrderConfirmation | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderConfirmation;
    return parsed.orderNumber === orderNumber ? parsed : null;
  } catch {
    return null;
  }
}
