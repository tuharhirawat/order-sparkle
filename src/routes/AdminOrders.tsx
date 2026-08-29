import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  adminOrdersByStatusQuery,
  statusTone,
} from "@/lib/admin-data";
import { OrderStatus } from "@/Types/orderTypes";

export default function AdminOrders() {
  const { category } = useParams<{ category: string }>();
  const status = ORDER_STATUSES.includes(category as OrderStatus)
    ? (category as OrderStatus)
    : undefined;

  const { data: orders, isPending } = useQuery({
    ...adminOrdersByStatusQuery(status as OrderStatus),
    enabled: !!status,
  });

  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();

  const filtered = (orders ?? []).filter((order) => {
    return (
      !term ||
      order.orderNumber.toLowerCase().includes(term) ||
      order.shipFullName.toLowerCase().includes(term) ||
      order.shipPhone.includes(term)
    );
  });

  if (!status) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Unknown order category.
      </p>
    );
  }

  return (
    <div>
      <nav className="text-xs text-muted-foreground">
        <Link
          to="/admin/orders"
          className="hover:text-foreground"
        >
          Orders
        </Link>

        <span className="mx-2">/</span>

        <span className="text-foreground">
          {category}
        </span>
      </nav>

      <h1 className="mt-2 font-display text-4xl">{STATUS_LABELS[status]}</h1>

      <div className="mt-8">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order ID, name or phone"
          className="h-10 max-w-xs rounded-sm"
        />
      </div>

      <div className="mt-8 space-y-3">
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-sm" />
          ))}

        {!isPending && filtered.length === 0 && (
          <p className="rounded-sm border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No orders match this view.
          </p>
        )}

        {filtered.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => navigate(`/admin/orders/${status}/${order.id}`)}
            className="w-full rounded-sm border border-border px-5 py-4 text-left transition-colors hover:border-gold/40"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium">{order.orderNumber}</span>
              <span className="text-sm text-muted-foreground">
                {order.shipFullName} · {order.shipPhone}
              </span>
              <span
                className={`rounded-sm border px-2 py-1 text-xs ${statusTone(
                  order.status
                )}`}
              >
                {order.status}
              </span>
              {order.paymentStatus ? (
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {order.paymentStatus}
                </span>
              ) : (
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Payment —
                </span>
              )}
              <span className="ml-auto text-sm font-medium">
                {formatCurrency(order.subtotal)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(order.createdAt)}
              </span>
            </div>

            {order.paymentStatus !== "Refunded" && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>
                  Paid: <span className="text-foreground">{formatCurrency(order.amountPaid)}</span>
                </span>
                <span>
                  Pending: <span className="text-foreground">{formatCurrency(order.amountPending)}</span>
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}