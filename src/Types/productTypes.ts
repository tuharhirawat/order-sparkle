export type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export interface ProductSummary {
  id: string;
  name: string;
  urlName: string;
  price: number;
  compareAtPrice?: number | null;
  discountPercentage: number | null;
  displayPrice: number;
  originalPrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  inStock: boolean;
  thumbnailUrl: string | null;
  category?: {
    id: string;
    name: string;
    urlName: string;
    imageUrl?: string | null;
  } | null;
}

export interface AdminProductImage {
  id: string;
  productId: string;
  url: string;
  position: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  productCode: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  discountPercentage: number | null;
  displayPrice: number;
  originalPrice: number | null;
  material?: string | null;
  details?: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  category?: {
    id: string;
    name: string;
    urlName: string;
    imageUrl?: string | null;
  };
  productImages: AdminProductImage[];
}

export interface Category {
  id: string;
  name: string;
  urlName: string;
  description?: string | null;
  imageUrl?: string | null;
  initials: string;
  isActive: boolean;
  createdAt: string;
  productCount: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  position: number;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  label: string;
  variantCode?: string | null;
  priceDelta: number;
  stock: number;
  isActive: boolean;
  position: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  productCode: string;
  description?: string | null;
  urlName: string;
  price: number;
  compareAtPrice?: number | null;
  discountPercentage: number | null;
  displayPrice: number;
  originalPrice: number | null;
  material?: string | null;
  details?: string | null;
  stock: number;
  category?: Category | null;
  isActive: boolean;
  isFeatured: boolean;
  trackStock: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  productImages: ProductImage[];
  productVariants: ProductVariant[];
}

export interface ProductFilters {
  categorySlug?: string | undefined;
  search?: string | undefined;
  sort?: SortKey | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minDiscountPercentage?: number | undefined;
  featuredOnly?: boolean | undefined;
  inStockOnly?: boolean | undefined;
  excludeProductId?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}