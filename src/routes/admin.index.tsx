import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Package, ShoppingCart, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  adminCustomersQuery,
  adminOrdersQuery,
  adminProductsQuery,
  statusTone,
} from "@/lib/admin-data";

export default function AdminDashboard() {
  const { data: orders, isPending } = useQuery(adminOrdersQuery());
  const { data: products } = useQuery(adminProductsQuery());
  const { data: customers } = useQuery(adminCustomersQuery());

  const live = (orders ?? []).filter((o) => o.status !== "Cancelled");
  const revenue = live.reduce((sum, o) => sum + Number(o.total), 0);
  const pending = (orders ?? []).filter((o) => o.status === "PendingConfirmation").length;

  const stats = [
    { label: "Order requests", value: String(orders?.length ?? 0), icon: ShoppingCart },
    { label: "Awaiting confirmation", value: String(pending), icon: Package },
    { label: "Order value", value: formatCurrency(revenue), icon: IndianRupee },
    { label: "Customers", value: String(customers?.length ?? 0), icon: Users },
  ];

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 font-display text-4xl">Dashboard</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-panel rounded-sm p-6">
            <stat.icon className="size-4 text-gold" aria-hidden />
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-3xl">
              {isPending ? <Skeleton className="h-8 w-20" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-end justify-between">
        <h2 className="font-display text-2xl">Latest requests</h2>
        <Link
          to="/admin/orders"
          className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          All orders
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Placed</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(orders ?? []).slice(0, 8).map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-medium">{order.order_number}</td>
                <td className="px-4 py-3">
                  {order.ship_full_name}
                  <span className="block text-xs text-muted-foreground">{order.ship_phone}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-sm border px-2 py-1 text-xs ${statusTone(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(order.total))}</td>
              </tr>
            ))}
            {!isPending && (orders ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No order requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        {products?.length ?? 0} products in the catalogue.
      </p>
    </div>
  );
}
