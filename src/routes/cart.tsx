import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/lib/cart";
import dictionary from "@/Constants/dictionary";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Your Bag — ${dictionary.siteFullName}` },
      {
        name: "description",
        content: `Review the jewellery in your bag and send an order request to the ${dictionary.siteFullName} studio.`,
      },
      { property: "og:title", content: `Your Bag — ${dictionary.siteFullName}` },
      {
        property: "og:description",
        content: "Review your selected jewellery and request your order.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQuantity, removeItem, hydrated } = useCart();

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">Your selection</p>
        <h1 className="mt-2 font-display text-5xl">The bag</h1>

        {!hydrated ? null : items.length === 0 ? (
          <div className="mt-16 rounded-sm border border-dashed border-border py-24 text-center">
            <ShoppingBag className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-2xl">Your bag is empty</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every piece is made to order — start with the collection.
            </p>
            <Button asChild className="mt-8 rounded-sm px-8 text-xs uppercase tracking-[0.2em]">
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
            <ul className="divide-y divide-border border-y border-border">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="flex gap-5 py-6"
                >
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.slug }}
                    className="size-24 shrink-0 overflow-hidden rounded-sm bg-surface sm:size-28"
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link
                          to="/product/$slug"
                          params={{ slug: item.slug }}
                          className="font-display text-xl transition-colors hover:text-gold"
                        >
                          {item.name}
                        </Link>
                        {item.variantLabel && (
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {item.variantLabel}
                          </p>
                        )}
                      </div>
                      <p className="whitespace-nowrap text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div className="flex items-center rounded-sm border border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-sm"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() =>
                            setQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-sm"
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={item.quantity >= item.maxQuantity}
                          onClick={() =>
                            setQuantity(item.productId, item.variantId, item.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-sm text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.productId, item.variantId)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="surface-panel h-fit rounded-sm p-8">
              <h2 className="font-display text-2xl">Summary</h2>
              <Separator className="my-6" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>Confirmed on request</span>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="flex justify-between text-base">
                <span>Estimated total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <Button
                asChild
                size="lg"
                className="mt-8 w-full rounded-sm text-xs uppercase tracking-[0.2em]"
              >
                <Link to="/checkout">Request order</Link>
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                No payment is taken online. We record your request, give you an order ID, and
                confirm everything with you on WhatsApp.
              </p>
              <Link
                to="/shop"
                className="mt-6 block text-center text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
