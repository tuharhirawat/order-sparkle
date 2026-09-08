import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gem, MessageCircle, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard, ProductGridSkeleton } from "@/components/site/product-card";
import { CategoryRail } from "@/components/site/CategoryCarousel";
import { Button } from "@/components/ui/button";
import { productsQuery } from "@/lib/catalog";
import AnnouncementBanner from "@/components/site/AnnouncementBanner";

const promises = [
  {
    icon: Gem,
    title: "Thoughtfully crafted",
    body: "Beautifully finished pieces chosen for their quality, detail and timeless appeal.",
  },
  {
    icon: MessageCircle,
    title: "Personal confirmation",
    body: "We confirm availability, sizing and payment with you directly on WhatsApp.",
  },
  {
    icon: ShieldCheck,
    title: "Insured delivery",
    body: "Fully insured, signature-required shipping anywhere in India.",
  },
];

export default function HomePage() {
  const { data: featuredResult, isPending } = useQuery(productsQuery({ featuredOnly: true, pageSize: 8 }));
  const featured = featuredResult?.items;

  const { data: clearanceResult, isPending: clearancePending } = useQuery(
    productsQuery({ minDiscountPercentage: 50, pageSize: 8 })
  );
  const clearance = clearanceResult?.items;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="relative aspect-[4/5] w-full min-h-[260px] max-h-[640px] xs:aspect-[3/4] sm:aspect-[16/9] sm:min-h-[340px] lg:aspect-[21/9]">
          <img
            src="/images/MamtasHomeBGV2.png"
            alt="Mamta's Imitation Jewellery"
            width={1920}
            height={1080}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />

          <div className="absolute left-1/2 top-2 z-20 w-full -translate-x-1/2 px-3 sm:top-5 sm:px-4">
            <AnnouncementBanner widthClassName="max-w-xl" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />

          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 sm:bottom-8 sm:left-8 sm:gap-3 lg:bottom-10 lg:left-12">
            <Button
              asChild
              size="sm"
              className="rounded-sm px-4 text-[0.65rem] uppercase tracking-[0.15em] sm:size-lg sm:px-7 sm:text-xs sm:tracking-[0.2em]"
            >
              <Link to="/shop">Explore the collection</Link>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="
                rounded-sm border-foreground/30 bg-background/85 px-4
                text-[0.65rem] uppercase tracking-[0.15em] backdrop-blur-sm sm:px-7 sm:text-xs sm:tracking-[0.2em]
              "
            >
              <Link to="/categories">Browse collections</Link>
            </Button>
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

      {clearance && clearance.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Limited time</p>
              <h2 className="mt-2 font-display text-4xl">Stock clearance sale</h2>
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
            {clearancePending ? (
              <ProductGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
                {clearance.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* OLD CATEGORY SECTION THAT CAN BE REMOVED ONCE CONFIRMED BY BHAIYA */}
      {/* <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="eyebrow">Shop by</p>
        <h2 className="mt-2 font-display text-4xl">Collections</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${encodeURIComponent(category.urlName)}`}
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
      </section> */}

    </SiteLayout>
  );
}
