import { queryOptions } from "@tanstack/react-query";
import api from "@/Services/api";
import { Product, ProductSummary, Category, ProductVariant } from "@/Types/productTypes";

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

async function fetchProducts(filters: ProductFilters): Promise<ProductSummary[]> {
  const params = new URLSearchParams();

  if (filters.categorySlug) {
    params.set("categoryUrlName", filters.categorySlug);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  if (typeof filters.minPrice === "number") {
    params.set("minPrice", filters.minPrice.toString());
  }

  if (typeof filters.maxPrice === "number") {
    params.set("maxPrice", filters.maxPrice.toString());
  }

  if (filters.featuredOnly) {
    params.set("featuredOnly", "true");
  }

  if (filters.inStockOnly) {
    params.set("inStockOnly", "true");
  }

  if (filters.limit) {
    params.set("limit", filters.limit.toString());
  }

  const response = await api.get<ProductSummary[]>("/Product", {
    params,
  });

  return response.data;
}

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const response = await api.get<Category[]>("/Product/Categories");

      return response.data;
    },
    staleTime: 60_000,
  });

export const productsQuery = (filters: ProductFilters = {}) =>
  queryOptions({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 30_000,
  });

export const productQuery = (urlName: string) =>
  queryOptions({
    queryKey: ["product", urlName],
    queryFn: async (): Promise<Product | null> => {
      try {
        const response = await api.get<Product>(
          `/Product/Details/${encodeURIComponent(urlName)}`
        );

        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    staleTime: 30_000,
  });

export function variantPrice(
  product: Product,
  variant: ProductVariant | null
): number {
  return Number(product.price) + Number(variant?.priceDelta ?? 0);
}

export function availableStock(
  product: Product,
  variant: ProductVariant | null
): number {
  if (!product.trackStock) return 99;

  return variant ? variant.stock : product.stock;
}
