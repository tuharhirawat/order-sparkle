import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — Mamta's Imitation Jewellery" },
      {
        name: "description",
        content:
          "Four decades of hand-finished gold and diamond jewellery from Visakhapatnam. Learn how Maamta's designs, crafts and personally delivers every piece.",
      },
      { property: "og:title", content: "Our Story — Mamta's Imitation Jewellery" },
      {
        property: "og:description",
        content: "Four decades of hand-finished gold and diamond jewellery from Visakhapatnam.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="eyebrow">Our story</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">A workshop, not a warehouse</h1>
        <div className="mt-8 gold-rule" />
        <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            Mamta's began in 1984 with a single bench in Visakhapatnam and a simple belief: jewellery should
            be made slowly, by people whose names you can learn. Four decades later we still finish
            every setting by hand, and we still make each piece to order.
          </p>
          <p>
            Because everything is crafted individually, we confirm each request personally. When you
            send an order request, it is recorded in our studio immediately and we reach out on
            WhatsApp to confirm sizing, availability and payment before anything is charged.
          </p>
          <p>
            Our gold is BIS hallmarked, our diamonds are conflict-free and independently certified,
            and every delivery is insured until it reaches your hands.
          </p>
        </div>
        <Button asChild className="mt-10 rounded-sm px-8 text-xs uppercase tracking-[0.2em]">
          <Link to="/shop">Explore the collection</Link>
        </Button>
      </article>
    </SiteLayout>
  );
}
