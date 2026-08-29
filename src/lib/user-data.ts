import api from "@/Services/api";
import { queryOptions } from "@tanstack/react-query";
import { CreateOrderResponse, CreateOrderRequest, MyOrderRequestsResponse } from "@/Types/orderTypes";

export async function createOrderRequest(input: CreateOrderRequest): Promise<CreateOrderResponse> {
  try {
    const { data } = await api.post<CreateOrderResponse>("/Order/Create", input);
    return data;
  } catch (err: any) {
    const message = err?.response?.data?.message ?? "We could not create your order. Please try again.";
    throw new Error(message);
  }
}

export async function getMyOrderRequests(): Promise<MyOrderRequestsResponse[]> {
  const { data } = await api.get<MyOrderRequestsResponse[]>("/Order/MyRequests");
  return data ?? [];
}

export const myOrderRequestsQuery = () =>
  queryOptions({
    queryKey: ["my-order-requests"],
    queryFn: () => getMyOrderRequests(),
    staleTime: 15_000,
  });