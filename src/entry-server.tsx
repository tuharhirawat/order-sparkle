// src/entry-server.tsx
//
// This is the SSR entry point. It runs in plain Node.js (via Vite's SSR
// build) — NO browser, NO Puppeteer, NO child process, NO port. Just
// JavaScript function calls that produce an HTML string directly.
//
// It is built separately from your normal client app via:
//   vite build --ssr src/entry-server.tsx --outDir dist-server
//
// ─────────────────────────────────────────────────────────────────────────
// Route-discovery exports — consumed by scripts/ssr-prerender.mjs (which now
// also generates the sitemap from this same data — see that file's header
// comment). These are the ONLY functions anywhere in the codebase that know
// how to walk /Product pages or list categories. Both reuse
// productsQuery/categoriesQuery from ./lib/catalog, so if the backend DTO
// shape changes and catalog.ts's types are updated to match, this file just
// recompiles correctly. If catalog.ts is NOT updated to match, TypeScript
// fails the build right here — before Vercel, before prerendering, before
// a broken sitemap ever ships.
// ─────────────────────────────────────────────────────────────────────────

import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./lib/theme";
import { CartProvider } from "./lib/cart";
import { AuthProvider } from "./hooks/use-auth";
import HomePage from "./routes/index";
import CategoriesPage from "./routes/categories";
import ShopPage from "./routes/shop";
import ProductPage from "./routes/product.$slug";
import { categoriesQuery, productsQuery, productQuery } from "./lib/catalog";
import type { ProductSummary, Category, ProductFilters } from "./Types/productTypes";

// Real <Routes>/<Route> matching — this is required, not optional, even
// though we already know which page we want: ProductPage calls useParams()
// to read :slug from the URL, and useParams() only returns anything when
// the component is actually rendered underneath a matching <Route>. Without
// this, :slug silently comes back empty and the page renders nothing.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/product/:slug" element={<ProductPage />} />
    </Routes>
  );
}

// Pre-fetches exactly the data each page needs, BEFORE rendering, so
// useQuery() calls inside the components find data already sitting in
// the cache and return it synchronously — no loading spinners baked in.
async function prefetchForRoute(queryClient: QueryClient, pathname: string, search: string) {
  if (pathname === "/") {
    await Promise.all([
      queryClient.prefetchQuery(productsQuery({ featuredOnly: true, pageSize: 8 })),
      queryClient.prefetchQuery(productsQuery({ minDiscountPercentage: 50, pageSize: 8 })),
    ]);
    return;
  }

  if (pathname === "/categories") {
    await queryClient.prefetchQuery(categoriesQuery());
    return;
  }

  if (pathname === "/shop") {
    const params = new URLSearchParams(search);
    const category = params.get("category") ?? undefined;
    await Promise.all([
      queryClient.prefetchQuery(categoriesQuery()),
      queryClient.prefetchQuery(
        productsQuery({ categorySlug: category, sort: "newest", page: 1, pageSize: 12 }),
      ),
    ]);
    return;
  }

  if (pathname.startsWith("/product/")) {
    const slug = decodeURIComponent(pathname.replace("/product/", ""));
    await queryClient.prefetchQuery(productQuery(slug));

    const product = queryClient.getQueryData<{ id?: string; category?: { urlName?: string } }>([
      "product",
      slug,
    ]);

    if (product?.category?.urlName) {
      await queryClient.prefetchQuery(
        productsQuery({
          categorySlug: product.category.urlName,
          excludeProductId: product.id,
          pageSize: 8,
        }),
      );
    }
  }
}

/**
 * Renders one route to a complete HTML string.
 * `url` should be a path + optional query string, e.g. "/product/gold-necklace"
 * or "/shop?category=necksets".
 */
export async function render(url: string) {
  const parsed = new URL(url, "http://localhost");
  const pathname = parsed.pathname;
  const search = parsed.search;

  // A fresh QueryClient per render — this is a one-shot server render,
  // not a long-lived client, so no caching concerns between routes.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // don't waste build time retrying a failed fetch
      },
    },
  });

  await prefetchForRoute(queryClient, pathname, search);

  const app = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <StaticRouter location={url}>
              <AppRoutes />
            </StaticRouter>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  const html = renderToString(app);
  return { html };
}

// ─────────────────────────────────────────────────────────────────────────
// Route-discovery exports — consumed by scripts/ssr-prerender.mjs and
// scripts/generate-sitemap.mjs. These are the ONLY functions anywhere in
// the codebase that know how to walk /Product pages or list categories.
// Both reuse productsQuery/categoriesQuery from ./lib/catalog, so if the
// backend DTO shape changes and catalog.ts's types are updated to match,
// this file just recompiles correctly. If catalog.ts is NOT updated to
// match, TypeScript fails the build right here — before Vercel, before
// prerendering, before a broken sitemap ever ships.
// ─────────────────────────────────────────────────────────────────────────

/** Fetches every active product across all pages, using the same typed query as the React app. */
export async function getAllProducts(): Promise<ProductSummary[]> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const all: ProductSummary[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const filters: ProductFilters = { sort: "newest", page, pageSize: 40 };
    const result = await queryClient.fetchQuery(productsQuery(filters));

    // Runtime guard: catches a backend shape change even if catalog.ts's
    // types were (incorrectly) left unchanged to match. Fails loudly
    // instead of silently returning partial/empty routes.
    if (!Array.isArray(result.items) || typeof result.totalPages !== "number") {
      throw new Error(
        `getAllProducts: unexpected /Product response shape on page ${page}: ${JSON.stringify(result).slice(0, 200)}`,
      );
    }

    all.push(...result.items);
    totalPages = result.totalPages;
    page++;
  } while (page <= totalPages);

  return all;
}

/** Fetches every active category, using the same typed query as the React app. */
export async function getAllCategories(): Promise<Category[]> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const categories = await queryClient.fetchQuery(categoriesQuery());

  if (!Array.isArray(categories)) {
    throw new Error(
      `getAllCategories: unexpected /Product/Categories response shape: ${JSON.stringify(categories).slice(0, 200)}`,
    );
  }

  return categories;
}