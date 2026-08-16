import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageSearch } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { accountSessionQuery, myOrderRequestsQuery } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/my-orders")({
  head: () => ({
    meta: [
      { title: "My order requests — Mamta's Imitation Jewellery" },
      { name: "description", content: "Track the status of every jewellery order request you've placed." },
      { property: "og:title", content: "My order requests — Mamta's Imitation Jewellery" },
      { property: "og:description", content: "Track the status of your Mamta's Imitation Jewellery order requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyOrdersPage,
});

const STATUS_TONE: Record<string, string> = {
  PendingConfirmation: "bg-secondary text-secondary-foreground",
  Confirmed: "bg-gold/15 text-gold",
  PaymentPending: "bg-secondary text-secondary-foreground",
  PaymentReceived: "bg-gold/15 text-gold",
  Processing: "bg-gold/15 text-gold",
  Shipped: "bg-gold/20 text-gold",
  Delivered: "bg-gold/25 text-gold",
  Cancelled: "bg-destructive/10 text-destructive",
};

function MyOrdersPage() {
  const { data: session } = useQuery(accountSessionQuery());
  const { data: orders, isPending, isError } = useQuery(myOrderRequestsQuery());

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <p className="eyebrow">Your account</p>
        <h1 className="mt-3 font-display text-4xl font-normal text-foreground">My order requests</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {session?.profile?.fullName
            ? `${session.profile.fullName} — `
            : ""}
          Requests placed with {session?.email ?? "your account"}
          {session?.profile?.phone ? ` or ${session.profile.phone}` : ""}.
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

        <div className="mt-10 space-y-6">
          {(orders ?? []).map((order) => (
            <article key={order.orderNumber} className="surface-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl text-foreground">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${
                      STATUS_TONE[order.status] ?? "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {titleCase(order.status)}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {titleCase(order.paymentStatus)}
                  </span>
                </div>
              </div>

              <Separator className="my-5" />

              <ul className="space-y-4">
                {order.items.map((item, index) => (
                  <li key={`${order.orderNumber}-${index}`} className="flex items-center gap-4">
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
                        {item.variantLabel ? `${item.variantLabel} · ` : ""}Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{formatCurrency(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>

              <Separator className="my-5" />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Delivering to {order.shipLine1}, {order.shipCity}, {order.shipState} {order.shipPincode}
                </p>
                <p className="font-display text-lg text-foreground">{formatCurrency(order.total)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
