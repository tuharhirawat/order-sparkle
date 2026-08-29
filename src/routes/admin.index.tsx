import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Package, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  adminOrderSummaryQuery,
  statusTone,
  paymentStatusTone,
  ORDER_STATUSES,
  STATUS_LABELS,
} from "@/lib/admin-data";

// This dashboard's data never includes closed-out orders (Completed, Cancelled,
// Refunded) — see /admin/orders for those. Filter the options down to match.
const EXCLUDED_STATUSES = new Set(["Completed", "Cancelled", "Refunded"]);
const DASHBOARD_STATUSES = ORDER_STATUSES.filter((status) => !EXCLUDED_STATUSES.has(status));

export default function AdminDashboard() {
  const { data: orders, isPending } = useQuery(adminOrderSummaryQuery());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const allOrders = orders ?? [];
  const liveOrders = allOrders.filter(
    (order) => order.status !== "Cancelled" && order.status !== "Refunded"
  );
  const orderValue = liveOrders.reduce(
    (sum, order) => sum + order.subtotal, 0
  );
  const awaitingAcknowledgement = allOrders.filter(
    (order) => order.status === "PendingAcknowledgement"
  ).length;

  const stats = [
    {
      label: "Order requests",
      value: String(allOrders.length),
      icon: ShoppingCart,
    },
    {
      label: "Awaiting acknowledgement",
      value: String(awaitingAcknowledgement),
      icon: Package,
    },
    {
      label: "Order value",
      value: formatCurrency(orderValue),
      icon: IndianRupee,
    }
  ];

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const statusMatch = statusFilter === "all" || order.status === statusFilter;
      return statusMatch;
    });
  }, [allOrders, statusFilter]);

  const hasActiveFilters = statusFilter !== "all";

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 font-display text-4xl">Dashboard</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="surface-panel rounded-sm p-6"
            >
              <Icon
                className="size-4 text-gold"
                aria-hidden
              />

              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </p>

              {isPending ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-2 font-display text-3xl">{stat.value}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl">Latest orders</h2>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[180px] rounded-sm text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {DASHBOARD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter("all");
              }}
              className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Placed</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {filteredOrders.slice(0, 8).map((order) => (
              <tr
                key={order.id}
                className="transition-colors hover:bg-secondary/30"
              >
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.shipFullName}
                  <span className="block text-xs text-muted-foreground">{order.shipPhone}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-sm border px-2 py-1 text-xs ${statusTone(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {order.paymentStatus ? (
                    <span
                      className={`inline-block rounded-sm border px-2 py-1 text-xs ${paymentStatusTone(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(order.subtotal)}
                </td>
              </tr>
            ))}

            {!isPending && filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {allOrders.length === 0 ? "No orders yet." : "No orders match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}