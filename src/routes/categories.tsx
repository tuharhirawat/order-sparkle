import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { CategoryRail } from "@/components/site/category-rail";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQuery, productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Collections — Aurelia Fine Jewellery" },
      {
        name: "description",
        content:
          "Browse Aurelia's jewellery collections: rings, necklaces, earrings and bracelets in hallmarked gold and certified diamonds.",
      },
      { property: "og:title", content: "Collections — Aurelia Fine Jewellery" },
      {
        property: "og:description",
        content: "Rings, necklaces, earrings and bracelets in hallmarked gold and certified diamonds.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories, isPending } = useQuery(categoriesQuery());
  const { data: products } = useQuery(productsQuery());

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="eyebrow">Shop by</p>
        <h1 className="mt-2 font-display text-5xl">Collections</h1>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-sm" />
              ))
            : (categories ?? []).map((category) => {
                const count = (products ?? []).filter(
                  (p) => p.categories?.slug === category.slug,
                ).length;
                return (
                  <Link
                    key={category.id}
                    to="/shop"
                    search={{ category: category.slug }}
                    className="surface-panel group flex min-h-56 flex-col justify-between rounded-sm p-10 transition-shadow hover:shadow-lifted"
                  >
                    <div>
                      <h2 className="font-display text-3xl transition-colors group-hover:text-gold">
                        {category.name}
                      </h2>
                      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                    <span className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {count} {count === 1 ? "piece" : "pieces"}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
        </div>
      </div>
    </SiteLayout>
  );
}
