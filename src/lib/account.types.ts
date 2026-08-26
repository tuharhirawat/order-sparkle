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
    /** Current stock available for this item, or null when stock isn't tracked / already reserved. */
    available: number | null;
  }[];
}
