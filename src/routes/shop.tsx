import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard, ProductGridSkeleton } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PAGE_SIZE_LIMITS } from "@/Constants/productConstants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { SortKey } from "@/Types/productTypes";

interface ShopSearch {
  q?: string | undefined;
  category?: string | undefined;
  sort?: SortKey | undefined;
  min?: number | undefined;
  max?: number | undefined;
  inStock?: boolean | undefined;
  page?: number | undefined;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Alphabetical" },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const num = (value: string | null) => {
    const parsed = Number(value);
    return value !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const sort = searchParams.get("sort");
  const pageParam = num(searchParams.get("page"));
  const search: ShopSearch = {
    ...(searchParams.get("q") ? { q: searchParams.get("q")!.slice(0, 80) } : {}),
    ...(searchParams.get("category") ? { category: searchParams.get("category")! } : {}),
    ...(SORTS.some((option) => option.value === sort) ? { sort: sort as SortKey } : {}),
    ...(num(searchParams.get("min")) !== undefined ? { min: num(searchParams.get("min")) } : {}),
    ...(num(searchParams.get("max")) !== undefined ? { max: num(searchParams.get("max")) } : {}),
    ...(searchParams.get("inStock") === "true" ? { inStock: true } : {}),
    page: pageParam && pageParam >= 1 ? pageParam : 1,
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useQuery(categoriesQuery());
  const [minInput, setMinInput] = useState(search.min?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(search.max?.toString() ?? "");
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setMinInput(search.min?.toString() ?? "");
    setMaxInput(search.max?.toString() ?? "");
  }, [search.min, search.max]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const min = minInput === "" ? undefined : Number(minInput);
      const max = maxInput === "" ? undefined : Number(maxInput);

      if (min !== undefined && max !== undefined && min > max) {
        setPriceError("Min price can't be greater than max price.");
        return;
      }

      setPriceError(null);

      if (min !== search.min || max !== search.max) {
        update({ min, max });
      }
    }, 400);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minInput, maxInput]);

  const currentPage = search.page ?? 1;
  const batchNumber = Math.ceil(currentPage / PAGE_SIZE_LIMITS.pagesPerBatch); // 1, 2, or 3
  const indexInBatch = (currentPage - 1) % PAGE_SIZE_LIMITS.pagesPerBatch; // 0, 1, or 2

  const {
    data: batchResult,
    isPending,
    isError,
    refetch,
  } = useQuery(
    productsQuery({
      search: search.q,
      categorySlug: search.category,
      sort: search.sort ?? "newest",
      minPrice: search.min,
      maxPrice: search.max,
      inStockOnly: search.inStock,
      page: batchNumber,
      pageSize: PAGE_SIZE_LIMITS.batchSize,
    }),
  );

  const sliceStart = indexInBatch * PAGE_SIZE_LIMITS.pageSize;
  const products = batchResult?.items.slice(sliceStart, sliceStart + PAGE_SIZE_LIMITS.pageSize);
  const totalCount = batchResult?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE_LIMITS.pageSize); // UI page count, based on 20/page

  const update = (patch: Partial<ShopSearch>) =>
    setSearchParams((previous) => {
      const shouldResetPage = !("page" in patch);
      const next = {
        ...Object.fromEntries(previous),
        ...patch,
        ...(shouldResetPage ? { page: 1 } : {}),
      } as Record<string, unknown>;

      Object.keys(next).forEach((key) => {
        const value = next[key];
        if (value === undefined || value === "" || value === false || (key === "page" && value === 1)) {
          delete next[key];
        }
      });

      return next as Record<string, string>;
    });

  const activeCategory = categories?.find((c) => c.urlName === search.category);
  const hasFilters = Boolean(
    search.q || search.category || search.min || search.max || search.inStock,
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">{search.q ? "Search results" : "The collection"}</p>
        <h1 className="mt-2 font-display text-5xl">
          {search.q ? `"${search.q}"` : (activeCategory?.name ?? "All jewellery")}
        </h1>
        {activeCategory?.description && (
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">{activeCategory.description}</p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="mr-2 size-3.5" />
            Filters
          </Button>
          <div className="hidden flex-wrap gap-2 lg:flex">
            <Button
              variant={search.category ? "outline" : "secondary"}
              size="sm"
              className="rounded-sm text-xs uppercase tracking-[0.14em]"
              onClick={() => update({ category: undefined })}
            >
              All
            </Button>
            {(categories ?? []).filter((c) => c.productCount > 0).map((c) => (
              <Button
                key={c.id}
                variant={search.category === c.urlName ? "secondary" : "outline"}
                size="sm"
                className="rounded-sm text-xs uppercase tracking-[0.14em]"
                onClick={() => update({ category: c.urlName })}
              >
                {c.name}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Label htmlFor="sort" className="sr-only">
              Sort products
            </Label>
            <Select
              value={search.sort ?? "newest"}
              onValueChange={(value) => update({ sort: value as SortKey })}
            >
              <SelectTrigger id="sort" className="h-9 w-[190px] rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={`${filtersOpen ? "grid" : "hidden"} mt-6 gap-4 rounded-sm border border-border p-4 lg:!grid lg:grid-cols-4 lg:items-end`}
        >
          <div className="lg:hidden">
            <Label className="text-xs uppercase tracking-[0.14em]">Collection</Label>
            <Select
              value={search.category ?? "all"}
              onValueChange={(value) => update({ category: value === "all" ? undefined : value })}
            >
              <SelectTrigger className="mt-2 h-9 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {(categories ?? []).filter((c) => c.productCount > 0).map((c) => (
                  <SelectItem key={c.id} value={c.urlName}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="min-price" className="text-xs uppercase tracking-[0.14em]">
              Min price (₹)
            </Label>
            <Input
              id="min-price"
              type="number"
              min={0}
              inputMode="numeric"
              className="mt-2 h-9 rounded-sm"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="max-price" className="text-xs uppercase tracking-[0.14em]">
              Max price (₹)
            </Label>
            <Input
              id="max-price"
              type="number"
              min={0}
              inputMode="numeric"
              className="mt-2 h-9 rounded-sm"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
            />
            {priceError && (
              <p className="mt-1.5 text-xs text-red-500">{priceError}</p>
            )}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="in-stock"
              checked={Boolean(search.inStock)}
              onCheckedChange={(checked) => update({ inStock: checked === true })}
            />
            <Label htmlFor="in-stock" className="text-sm font-normal">
              In stock only
            </Label>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start rounded-sm"
              onClick={() => setSearchParams({})}
            >
              <X className="mr-1 size-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="mt-12">
          {isPending ? (
            <ProductGridSkeleton />
          ) : isError ? (
            <div className="rounded-sm border border-border py-20 text-center">
              <p className="font-display text-2xl">We couldn't load the collection</p>
              <p className="mt-2 text-sm text-muted-foreground">Please check your connection and try again.</p>
              <Button className="mt-6 rounded-sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : products && products.length > 0 ? (
            <>
              <p className="mb-8 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {totalCount} {totalCount === 1 ? "piece" : "pieces"}
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm"
                    disabled={currentPage <= 1}
                    onClick={() => update({ page: currentPage - 1 })}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "ellipsis" ? (
                          <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground">
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === currentPage ? "secondary" : "outline"}
                            size="sm"
                            className="size-9 rounded-sm p-0"
                            onClick={() => update({ page: p })}
                          >
                            {p}
                          </Button>
                        ),
                      )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => update({ page: currentPage + 1 })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-sm border border-dashed border-border py-24 text-center">
              <p className="font-display text-2xl">Nothing matches yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different collection, widen your price range, or clear the filters.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-sm"
                  onClick={() => setSearchParams({})}
                >
                  Clear filters
                </Button>
                <Button asChild className="rounded-sm">
                  <Link to="/categories">Browse collections</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
