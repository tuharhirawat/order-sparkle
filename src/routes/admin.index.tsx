import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Package, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  adminOrderSummaryQuery,
  statusTone,
} from "@/lib/admin-data";

export default function AdminDashboard() {
  const { data: orders, isPending } = useQuery(adminOrderSummaryQuery());

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

      <div className="mt-12 flex items-end justify-between">
        <h2 className="font-display text-2xl">Latest orders</h2>

        <Link
          to="/admin/orders"
          className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          All orders
        </Link>
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
            {(orders ?? []).slice(0, 8).map((order) => (
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
                    <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
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

            {!isPending && allOrders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}