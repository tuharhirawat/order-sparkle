import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard, ProductGridSkeleton } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQuery, productsQuery, type SortKey } from "@/lib/catalog";
import dictionary from "@/Constants/dictionary";

interface ShopSearch {
  q?: string | undefined;
  category?: string | undefined;
  sort?: SortKey | undefined;
  min?: number | undefined;
  max?: number | undefined;
  inStock?: boolean | undefined;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Alphabetical" },
];

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const sort = search["sort"];
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    return {
      ...(typeof search['q'] === "string" && search['q'] ? { q: search['q'].slice(0, 80) } : {}),
      ...(typeof search['category'] === "string" && search['category']
        ? { category: search['category'] }
        : {}),
      ...(SORTS.some((s) => s.value === sort) ? { sort: sort as SortKey } : {}),
      ...(num(search['min']) !== undefined ? { min: num(search['min']) } : {}),
      ...(num(search['max']) !== undefined ? { max: num(search['max']) } : {}),
      ...(search['inStock'] === true || search['inStock'] === "true" ? { inStock: true } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: `Shop All Jewellery — ${dictionary.siteFullName}` },
      {
        name: "description",
        content:
          "Shop hallmarked gold and diamond rings, necklaces, earrings and bracelets. Filter by collection, price and availability.",
      },
      { property: "og:title", content: `Shop All Jewellery — ${dictionary.siteFullName}` },
      {
        property: "og:description",
        content: "Filter hallmarked gold and diamond jewellery by collection, price and availability.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useQuery(categoriesQuery());
  const {
    data: products,
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
    }),
  );

  const update = (patch: Partial<ShopSearch>) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...patch } as Record<string, unknown>;
        Object.keys(next).forEach((key) => {
          const value = next[key];
          if (value === undefined || value === "" || value === false) delete next[key];
        });
        return next as ShopSearch;
      },
    });

  const activeCategory = categories?.find((c) => c.slug === search.category);
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
            {(categories ?? []).map((c) => (
              <Button
                key={c.id}
                variant={search.category === c.slug ? "secondary" : "outline"}
                size="sm"
                className="rounded-sm text-xs uppercase tracking-[0.14em]"
                onClick={() => update({ category: c.slug })}
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
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
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
              value={search.min ?? ""}
              onChange={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
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
              value={search.max ?? ""}
              onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
            />
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
              onClick={() => navigate({ search: {} })}
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
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
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
                  onClick={() => navigate({ search: {} })}
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
