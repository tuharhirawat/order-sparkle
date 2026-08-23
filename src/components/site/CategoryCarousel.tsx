import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesQuery } from "@/lib/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CategoryRail({ className }: { className?: string }) {
  const { data: categories, isPending } = useQuery(categoriesQuery());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateScrollState = () => {
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      setScrollState({
        left: scroller.scrollLeft > 1,
        right: maxScrollLeft - scroller.scrollLeft > 1,
      });
    };

    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);
    scroller.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateScrollState);
    };
  }, [categories]);

  const scrollBy = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label="Scroll categories left"
        onClick={() => scrollBy(-1)}
        disabled={!scrollState.left}
        className="surface-panel hidden size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground shadow-soft transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-0 md:grid"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth py-2 sm:gap-8"
      >
        {isPending
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex shrink-0 snap-start flex-col items-center gap-3">
              <Skeleton className="size-24 rounded-full sm:size-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
          : (categories ?? []).map((category) => {
            return (
              <Link
                key={category.id}
                to={`/shop?category=${encodeURIComponent(category.urlName)}`}
                className="group flex shrink-0 snap-start flex-col items-center gap-3 text-center"
              >
                <span className="relative grid size-24 place-items-center overflow-hidden rounded-full border border-border bg-secondary shadow-soft ring-1 ring-transparent transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-gold group-hover:ring-gold sm:size-28">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      loading="lazy"
                      className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="font-display text-2xl text-gold">
                      {category.initials ?? category.name.slice(0, 2).toUpperCase()}
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

      <button
        type="button"
        aria-label="Scroll categories right"
        onClick={() => scrollBy(1)}
        disabled={!scrollState.right}
        className="surface-panel hidden size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground shadow-soft transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-0 md:grid"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}