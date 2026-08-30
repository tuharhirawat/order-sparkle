import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { myOrderRequestsQuery } from "@/lib/user-data";
import { useAuth } from "@/hooks/use-auth";
import type { MyOrderRequestsResponse } from "@/Types/orderTypes";
import {
  statusTone as STATUS_TONE,
  paymentStatusTone as PAYMENT_STATUS_TONE,
} from "@/lib/admin-data";

type Tab = "inProgress" | "completed" | "cancelled";

const TAB_LABELS: Record<Tab, string> = {
  inProgress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled / Refunded",
};

function tabForOrder(order: MyOrderRequestsResponse): Tab {
  if (order.status === "OrderConfirmed") return "completed";
  if (order.status === "Cancelled" || order.status === "Refunded") return "cancelled";
  return "inProgress";
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("inProgress");
  const {
    data: orders,
    isPending,
    isError,
  } = useQuery({
    ...myOrderRequestsQuery(),
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const grouped: Record<Tab, MyOrderRequestsResponse[]> = {
    inProgress: [],
    completed: [],
    cancelled: [],
  };
  (orders ?? []).forEach((order) => grouped[tabForOrder(order)].push(order));

  const visible = grouped[tab];

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <p className="eyebrow">Your account</p>

        <h1 className="mt-3 font-display text-4xl font-normal text-foreground">My order requests</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {user.fullName ? `${user.fullName} — ` : ""}
          Requests placed with {user.email}
          {user.mobileNumber ? ` or ${user.mobileNumber}` : ""}.
        </p>

        <div className="gold-rule mt-8" />

        {isPending && (
          <div className="flex justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="py-20 text-center text-sm text-muted-foreground">
            We could not load your order requests. Please refresh and try again.
          </p>
        )}

        {!isPending && !isError && (orders?.length ?? 0) === 0 && (
          <div className="py-20 text-center">
            <PackageSearch className="mx-auto size-8 text-muted-foreground" />

            <h2 className="mt-6 font-display text-2xl text-foreground">No requests yet</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Orders you place with this email or mobile number will appear here.
            </p>

            <Button asChild className="mt-8">
              <Link to="/shop">Browse the collection</Link>
            </Button>
          </div>
        )}

        {!isPending && !isError && (orders?.length ?? 0) > 0 && (
          <>
            <div className="mt-8 flex flex-wrap gap-2 rounded-sm border border-border p-1">
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-sm px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${tab === t
                    ? "bg-gold text-background"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {TAB_LABELS[t]} ({grouped[t].length})
                </button>
              ))}
            </div>

            <div className="mt-10 space-y-6">
              {visible.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No orders in this section.
                </p>
              )}

              {visible.map((order) => (
                <article
                  key={order.orderNumber}
                  className="surface-panel p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-xl text-foreground">{order.orderNumber}</p>

                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${STATUS_TONE(
                          order.status
                        )}`}
                      >
                        {titleCase(order.status)}
                      </span>

                      {order.paymentStatus && (
                        <span
                          className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${PAYMENT_STATUS_TONE(
                            order.paymentStatus
                          )}`}
                        >
                          {titleCase(order.paymentStatus)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator className="my-5" />

                  <ul className="space-y-4">
                    {order.items.map((item, index) => (
                      <li
                        key={`${order.orderNumber}-${index}`}
                        className="flex items-center gap-4"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className="size-14 rounded-sm object-cover"
                          />
                        ) : (
                          <div className="size-14 rounded-sm bg-secondary" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{item.name}</p>

                          <p className="text-xs text-muted-foreground">
                            {item.variantLabel ? `${item.variantLabel} · ` : ""}
                            Qty {item.quantity}
                          </p>

                          {item.originalQuantity != null && (
                            <p className="mt-0.5 text-xs text-gold">
                              {item.quantity === 0
                                ? `This item was not available and has been removed from your order`
                                : `Only ${item.quantity} of ${item.originalQuantity} requested were available`}
                            </p>
                          )}
                        </div>

                        <p className="text-sm text-foreground">{formatCurrency(item.lineTotal)}</p>
                      </li>
                    ))}
                  </ul>

                  <Separator className="my-5" />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Delivering to{" "}
                      {order.shipLine1},{" "}
                      {order.shipCity},{" "}
                      {order.shipState}{" "}
                      {order.shipPincode}
                    </p>

                    <p className="font-display text-lg text-foreground">{formatCurrency(order.total)}</p>
                  </div>

                  {order.paymentStatus === "Refunded" && (
                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-xs text-destructive">This order has been refunded.</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
