import { queryOptions } from "@tanstack/react-query";
import { getMyOrderRequests } from "./account.functions";


export const myOrderRequestsQuery = () =>
  queryOptions({
    queryKey: ["my-order-requests"],
    queryFn: () => getMyOrderRequests(),
    staleTime: 15_000,
  });
