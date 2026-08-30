export type OrderStatus =
  | "PendingAcknowledgement"
  | "OrderAcknowledged"
  | "OrderConfirmed"
  | "Cancelled"
  | "Refunded";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Refunded";

export interface CreateOrderRequest {
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

export interface CreateOrderResponse {
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

export interface MyOrderRequestsResponse {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  total: number;
  amountPaid: number;
  amountPending: number;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipLine1: string;
  note: string | null;
  items: {
    name: string;
    variantLabel: string | null;
    quantity: number;
    originalQuantity: number | null;
    unitPrice: number;
    lineTotal: number;
    imageUrl: string | null;
  }[];
}

export interface AdminCustomer {
  profileId: string;
  fullName: string;
  phone: string;
  email: string | null;
  firstSeen: string;
  ordersCount: number;
  totalValue: number;
}