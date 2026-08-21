import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesQuery, productsQuery, type Category, type Product } from "@/lib/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function imageForCategory(category: Category, products: Product[] | undefined) {
  if (category.image_url) return category.image_url;
  const match = (products ?? []).find(
    (p) => p.categories?.slug === category.slug && p.product_images?.length,
  );
  const images = match?.product_images ?? [];
  const primary = [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
  return primary?.url ?? null;
}

export function CategoryRail({ className }: { className?: string }) {
  const { data: categories, isPending } = useQuery(categoriesQuery());
  const { data: products } = useQuery(productsQuery());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Scroll categories left"
        onClick={() => scrollBy(-1)}
        className="surface-panel absolute -left-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold md:grid"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll categories right"
        onClick={() => scrollBy(1)}
        className="surface-panel absolute -right-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold md:grid"
      >
        <ChevronRight className="size-4" />
      </button>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 py-2 sm:gap-8"
      >
        {isPending
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex shrink-0 snap-start flex-col items-center gap-3">
                <Skeleton className="size-24 rounded-full sm:size-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          : (categories ?? []).map((category) => {
              const src = imageForCategory(category, products);
              return (
                <Link
                  key={category.id}
                  to="/shop"
                  search={{ category: category.slug }}
                  className="group flex shrink-0 snap-start flex-col items-center gap-3 text-center"
                >
                  <span className="relative grid size-24 place-items-center overflow-hidden rounded-full border border-border bg-secondary shadow-soft ring-1 ring-transparent transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-gold group-hover:ring-gold sm:size-28">
                    {src ? (
                      <img
                        src={src}
                        alt={category.name}
                        loading="lazy"
                        className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="font-display text-2xl text-gold">
                        {category.name.charAt(0)}
                      </span>
                    )}
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-foreground/15 to-transparent opacity-60 transition-opacity group-hover:opacity-30" />
                  </span>
                  <span className="max-w-24 truncate text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground sm:max-w-28">
                    {category.name}
                  </span>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
