import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { ProductSummary } from "@/Types/productTypes";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductCard({ product }: { product: ProductSummary }) {
  const soldOut = !product.inStock;

  return (
    <Link
      to={`/product/${product.urlName}`}
      className="group block focus-visible:outline-none"
    >
      <article>
        <div className="relative aspect-video overflow-hidden rounded-sm bg-surface">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              loading="lazy"
              width={1024}
              height={1024}
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              Image coming soon
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.isNew && (
              <span className="rounded-sm bg-gold px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-gold-foreground">
                New
              </span>
            )}
            {soldOut && (
              <span className="rounded-sm bg-primary px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-primary-foreground">
                Sold out
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          {product.category?.name && <p className="eyebrow">{product.category.name}</p>}
          <h3 className="font-display text-xl leading-snug text-foreground transition-colors group-hover:text-gold">
            {product.name}
          </h3>
          <p className="flex items-baseline gap-2 text-sm text-foreground">
            {formatCurrency(Number(product.displayPrice))}
            {product.originalPrice != null && Number(product.originalPrice) > Number(product.displayPrice) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(Number(product.originalPrice))}
              </span>
            )}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full rounded-sm" />
      <Skeleton className="mt-4 h-3 w-16" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-20" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
