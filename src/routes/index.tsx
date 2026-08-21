import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gem, MessageCircle, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard, ProductGridSkeleton } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { categoriesQuery, productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurelia Fine Jewellery — Handcrafted Gold & Diamond Jewellery" },
      {
        name: "description",
        content:
          "Discover handcrafted 22k gold and diamond jewellery. Browse rings, necklaces, earrings and bracelets, then confirm your order personally on WhatsApp.",
      },
      { property: "og:title", content: "Aurelia Fine Jewellery — Handcrafted Gold & Diamond Jewellery" },
      {
        property: "og:description",
        content: "Handcrafted heirlooms in 22k gold and diamond, made to order and delivered across India.",
      },
    ],
  }),
  component: HomePage,
});

const promises = [
  { icon: Gem, title: "Hallmarked craftsmanship", body: "Every piece is BIS hallmarked and finished by hand in our atelier." },
  { icon: MessageCircle, title: "Personal confirmation", body: "We confirm availability, sizing and payment with you directly on WhatsApp." },
  { icon: ShieldCheck, title: "Insured delivery", body: "Fully insured, signature-required shipping anywhere in India." },
];

function HomePage() {
  const { data: featured, isPending } = useQuery(productsQuery({ featuredOnly: true, limit: 8 }));
  const { data: categories } = useQuery(categoriesQuery());

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <img
          src="/images/hero-jewellery.jpg"
          alt="A gold diamond solitaire ring resting on ivory silk"
          width={1920}
          height={1088}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10 dark:from-background dark:via-background/90 dark:to-background/30" />
        <div className="relative mx-auto flex min-h-[74vh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-xl animate-rise">
            <p className="eyebrow">Est. 1984 · Jaipur</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              Jewellery made to be
              <span className="italic text-gold"> inherited</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Hand-finished gold and diamond pieces, one at a time. Choose what you love, send us a
              request, and we will personally confirm every detail before anything is paid.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-sm px-8 text-xs uppercase tracking-[0.2em]">
                <Link to="/shop">Explore the collection</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-sm px-8 text-xs uppercase tracking-[0.2em]"
              >
                <Link to="/categories">Browse collections</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {promises.map((item) => (
            <div key={item.title} className="flex gap-4">
              <item.icon className="mt-1 size-5 shrink-0 text-gold" aria-hidden />
              <div>
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <CategoryRail />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Curated</p>
            <h2 className="mt-2 font-display text-4xl">Featured pieces</h2>
          </div>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-10">
          {isPending ? (
            <ProductGridSkeleton />
          ) : featured && featured.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              New pieces are being photographed. Please check back shortly.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="eyebrow">Shop by</p>
        <h2 className="mt-2 font-display text-4xl">Collections</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              to="/shop"
              search={{ category: category.slug }}
              className="surface-panel group flex flex-col justify-between rounded-sm p-8 transition-shadow hover:shadow-lifted"
            >
              <div>
                <h3 className="font-display text-2xl transition-colors group-hover:text-gold">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Shop
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
