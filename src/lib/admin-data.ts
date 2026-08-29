import { queryOptions } from "@tanstack/react-query";
import { AdminProduct, Category } from "@/Types/productTypes";
import { AdminCustomer } from "@/Types/orderTypes";
import api from "@/Services/api";
import { OrderStatus, PaymentStatus } from "@/Types/orderTypes";

export const ORDER_STATUSES: OrderStatus[] = [
  "PendingAcknowledgement",
  "OrderAcknowledged",
  "OrderConfirmed",
  "ReadyForShipment",
  "Completed",
  "Cancelled",
  "Refunded",
];

export interface AdminOrderItem {
  id: string;
  name: string;
  sku: string | null;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface OrderPayment {
  id: string;
  amount: number;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  subtotal: number;
  total: number;
  amountPaid: number;
  amountPending: number;
  shipFullName: string;
  shipPhone: string;
  shipEmail: string | null;
  shipLine1: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  customerNote: string | null;
  items: AdminOrderItem[];
}

export interface OrderTransition {
  field: "Status" | "PaymentStatus" | string;
  fromValue: string;
  toValue: string;
  createdAt: string;
  changedBy: string | null;
}

export interface OrderNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: string | null;
}

export interface AdminOrderDetails extends AdminOrder {
  history: OrderTransition[];
  notes: OrderNote[];
  payments: OrderPayment[];
}


export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  subtotal: number;
  amountPaid: number;
  amountPending: number;
  shipFullName: string;
  shipPhone: string;
  shipEmail: string | null;
  shipCity: string;
  shipState: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PendingAcknowledgement: "Pending Acknowledgement",
  OrderAcknowledged: "Acknowledged",
  OrderConfirmed: "Confirmed",
  ReadyForShipment: "Ready for Shipment",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Refunded: "Refunded",
};

export const adminOrderStatusCountsQuery = () =>
  queryOptions({
    queryKey: ["admin", "orders", "counts"],
    queryFn: async (): Promise<Record<OrderStatus, number>> => {
      const response = await api.get<Record<OrderStatus, number>>("/Order/Admin/Counts");
      return response.data;
    },
  });

export const adminOrdersByStatusQuery = (status: OrderStatus) =>
  queryOptions({
    queryKey: ["admin", "orders", "status", status],
    queryFn: async (): Promise<AdminOrderSummary[]> => {
      const response = await api.get<AdminOrderSummary[]>(`/Order/Admin/${status}`);
      return response.data;
    },
  });

export const adminOrderSummaryQuery = () =>
  queryOptions({
    queryKey: ["admin", "orders", "summary"],
    queryFn: async (): Promise<AdminOrderSummary[]> => {
      const response = await api.get<AdminOrderSummary[]>("/Order/Admin/Summary");
      return response.data;
    },
  });

export const adminOrderDetailsQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "orders", id],
    queryFn: async (): Promise<AdminOrderDetails> => {
      const response = await api.get<AdminOrderDetails>(`/Order/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

export const adminCustomersQuery = () =>
  queryOptions({
    queryKey: ["admin", "customers"],
    queryFn: async (): Promise<AdminCustomer[]> => {
      const response = await api.get<AdminCustomer[]>("/Order/Customers");
      return response.data;
    },
  });

export async function acknowledgeOrder(
  id: string
): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(
    `/Order/${id}/acknowledge`
  );

  return response.data;
}

export async function addOrderPayment(
  id: string,
  amount: number
): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(
    `/Order/${id}/payments`,
    { amount }
  );

  return response.data;
}

export async function markOrderDelivered(
  id: string
): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(
    `/Order/${id}/mark-delivered`
  );

  return response.data;
}

export async function cancelOrder(
  id: string
): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(
    `/Order/${id}/cancel`
  );

  return response.data;
}

export async function refundOrder(
  id: string
): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(
    `/Order/${id}/refund`
  );

  return response.data;
}

export async function addOrderNote(id: string, note: string): Promise<AdminOrderDetails> {
  const response = await api.post<AdminOrderDetails>(`/Order/${id}/notes`, { note });
  return response.data;
}

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
    case "Completed":
      return "border-gold/50 bg-gold/10 text-gold";

    case "Refunded":
    case "Cancelled":
      return "border-destructive/40 bg-destructive/10 text-destructive";

    case "PendingAcknowledgement":
      return "border-border bg-secondary text-muted-foreground";

    case "OrderAcknowledged":
      return "border-border bg-secondary text-foreground";

    case "OrderConfirmed":
      return "border-gold/50 bg-gold/10 text-gold";

    case "ReadyForShipment":
      return "border-gold/50 bg-gold/10 text-gold";

    default:
      return "border-border bg-secondary text-foreground";
  }
}

export function paymentStatusTone(
  status: PaymentStatus | null
): string {
  switch (status) {
    case "Paid":
      return "border-gold/50 bg-gold/10 text-gold";

    case "Refunded":
      return "border-destructive/40 bg-destructive/10 text-destructive";

    case "Pending":
      return "border-border bg-secondary text-muted-foreground";

    case "PartiallyPaid":
      return "border-gold/50 bg-gold/10 text-gold";

    default:
      // null = payment phase hasn't started yet
      return "border-border bg-secondary text-muted-foreground";
  }
}
