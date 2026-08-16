import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"categories">;
export type ProductImage = Tables<"product_images">;
export type ProductVariant = Tables<"product_variants">;

export type Product = Tables<"products"> & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories: Pick<Category, "name" | "slug"> | null;
};

export type StoreSettings = Tables<"store_settings">;

export const PRODUCT_SELECT =
  "*, product_images(*), product_variants(*), categories(name, slug)";

export type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export interface ProductFilters {
  categorySlug?: string | undefined;
  search?: string | undefined;
  sort?: SortKey | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  featuredOnly?: boolean | undefined;
  inStockOnly?: boolean | undefined;
  limit?: number | undefined;
}

function sortRows(rows: Product[], sort: SortKey): Product[] {
  const copy = [...rows];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case "price-desc":
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

async function fetchProducts(filters: ProductFilters): Promise<Product[]> {
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

  if (filters.featuredOnly) query = query.eq("is_featured", true);
  if (filters.search) {
    const term = `%${filters.search.replace(/[%,]/g, "")}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term},sku.ilike.${term},material.ilike.${term}`);
  }
  if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
  if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as unknown as Product[];
  if (filters.categorySlug) {
    rows = rows.filter((p) => p.categories?.slug === filters.categorySlug);
  }
  if (filters.inStockOnly) {
    rows = rows.filter((p) => !p.track_stock || p.stock > 0);
  }
  return sortRows(rows, filters.sort ?? "newest");
}

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const productsQuery = (filters: ProductFilters = {}) =>
  queryOptions({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 30_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as Product) ?? null;
    },
    staleTime: 30_000,
  });

export const storeSettingsQuery = () =>
  queryOptions({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings | null> => {
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 300_000,
  });

export function primaryImage(product: Pick<Product, "product_images" | "name">): {
  url: string | null;
  alt: string;
} {
  const sorted = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
  const first = sorted[0];
  return { url: first?.url ?? null, alt: first?.alt ?? product.name };
}

export function variantPrice(product: Product, variant: ProductVariant | null): number {
  return Number(product.price) + Number(variant?.price_delta ?? 0);
}

export function availableStock(product: Product, variant: ProductVariant | null): number {
  if (!product.track_stock) return 99;
  return variant ? variant.stock : product.stock;
}
