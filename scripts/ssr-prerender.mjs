// scripts/ssr-prerender.mjs
//
// Runs AFTER both builds:
//   1. vite build                                        -> dist/
//   2. vite build --ssr src/entry-server.tsx --outDir dist-server
//
// In plain Node.js, this single script now does everything that needs
// the product/category list:
//   1. Fetches products + categories ONCE (via the compiled SSR entry)
//   2. Renders every route to static HTML
//   3. Writes sitemap.xml from the SAME fetched data
//
// Merged with the old generate-sitemap.mjs specifically to avoid fetching
// products/categories twice across two separate node processes — each
// standalone `node script.mjs` run has its own memory, so two separate
// scripts calling the same fetch function still means two real network
// round-trips. Folding both jobs into one process fixes that.
//
// This script does NOT talk to the API directly. All data-fetching and
// shape knowledge lives in src/entry-server.tsx (TypeScript, typed against
// catalog.ts) so there is exactly one place to keep in sync with the backend.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const SSR_DIR = path.resolve(process.cwd(), "dist-server");
const SITE_URL = "https://www.mamtasimitationjewellery.com";

// ---------- Find the built SSR entry file ----------
async function findSsrEntry() {
  const preferred = path.join(SSR_DIR, "entry-server.js");
  if (existsSync(preferred)) return preferred;

  const files = await readdir(SSR_DIR);
  const jsFile = files.find((f) => f.endsWith(".js"));
  if (!jsFile) {
    throw new Error(`Could not find a built SSR entry file in ${SSR_DIR}`);
  }
  return path.join(SSR_DIR, jsFile);
}

// ---------- Fetch products + categories ONCE, derive everything from it ----------
// No try/catch on purpose: a failure here means the sitemap/prerender would
// be silently incomplete, which is exactly the bug we're avoiding. Let it
// throw — main()'s top-level .catch() fails the whole build loudly instead.
async function fetchRouteData(ssrModule) {
  const products = await ssrModule.getAllProducts();
  const categories = await ssrModule.getAllCategories();

  const productRoutes = products.filter((p) => p.urlName).map((p) => `/product/${p.urlName}`);
  const categoryRoutes = categories
    .filter((c) => c.urlName)
    .map((c) => `/shop?category=${c.urlName}`);

  const allRoutes = [...new Set(["/", "/shop", "/categories", ...productRoutes, ...categoryRoutes])];

  return { products, categories, allRoutes };
}

// ---------- Turn a route into a file path inside dist/ ----------
function routeToFilePath(route) {
  const [pathname, queryString] = route.split("?");
  let segments = pathname.split("/").filter(Boolean);

  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params.entries()) {
      segments.push(key, value);
    }
  }

  if (segments.length === 0) {
    return path.join(DIST_DIR, "index.html");
  }
  return path.join(DIST_DIR, ...segments, "index.html");
}

// ---------- Build sitemap.xml from the already-fetched products/categories ----------
function buildSitemapXml(products, categories) {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    { path: "/", priority: "1.0" },
    { path: "/shop", priority: "0.9" },
    { path: "/categories", priority: "0.8" },
    ...products
      .filter((p) => p.urlName)
      .map((p) => ({ path: `/product/${p.urlName}`, priority: "0.7" })),
    ...categories
      .filter((c) => c.urlName)
      .map((c) => ({ path: `/shop?category=${c.urlName}`, priority: "0.6" })),
  ];

  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

// ---------- Main ----------
async function main() {
  console.log("Locating built SSR entry...");
  const ssrEntryPath = await findSsrEntry();
  const ssrModule = await import(`file://${ssrEntryPath}`);
  const { render } = ssrModule;

  console.log("Reading client HTML template...");
  const template = await readFile(path.join(DIST_DIR, "index.html"), "utf-8");

  console.log("Fetching products and categories (once)...");
  const { products, categories, allRoutes } = await fetchRouteData(ssrModule);
  console.log(`Found ${allRoutes.length} routes to render.`);

  const failures = [];

  for (const route of allRoutes) {
    try {
      const { html: appHtml } = await render(route);

      // A real page's rendered content is always well over a few hundred
      // characters (header, footer, at least some page-specific markup).
      // If it's suspiciously short, the component almost certainly rendered
      // null (e.g. the product/category data wasn't found) — flag it loudly
      // instead of silently writing a near-empty file.
      if (appHtml.trim().length < 200) {
        console.warn(
          `  [WARNING] ${route} rendered only ${appHtml.trim().length} chars — likely empty/null content, not a real page.`,
        );
        failures.push(route);
      }

      // Inject the rendered app HTML into the exact same shell Vite built,
      // so all your real <script>/<link> tags (with correct hashed
      // filenames) stay untouched — only the empty <div id="root"></div>
      // gets filled in.
      const finalHtml = template.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`,
      );

      const filePath = routeToFilePath(route);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, finalHtml, "utf-8");

      console.log(`Rendered: ${route} -> saved`);
    } catch (err) {
      console.error(`!! failed to render ${route}:`, err.message);
      failures.push(route);
    }
  }

  console.log("SSR prerendering complete.");
  if (failures.length > 0) {
    console.warn(`\n${failures.length} route(s) need attention:`);
    for (const r of failures) console.warn(`  - ${r}`);
  }

  console.log("Building sitemap...");
  const xml = buildSitemapXml(products, categories);
  const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
  await writeFile(sitemapPath, xml, "utf-8");
  console.log(
    `Sitemap written with ${products.length + categories.length + 3} URLs -> ${sitemapPath}`,
  );
}

main().catch((err) => {
  console.error("Build script failed:", err);
  process.exit(1);
});
