// scripts/ssr-prerender.mjs
//
// Runs AFTER both builds:
//   1. vite build                                        -> dist/
//   2. vite build --ssr src/entry-server.tsx --outDir dist-server
//
// It then, in plain Node.js:
//   1. Fetches all products + categories from your live API (to know
//      every route that needs a page)
//   2. For each route, calls the SSR entry's render() function directly
//      (a normal JS function call — no browser, no server, no port)
//   3. Injects the resulting HTML into your dist/index.html template
//   4. Saves the result as a real static file under dist/
//
// This completely replaces the old Puppeteer-based approach. There is
// no child process, no port, no browser binary — so none of the
// process-hanging / platform-mismatch bugs we hit before are possible
// here by construction.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const API_BASE = "https://api.mamtasimitationjewellery.com/api";
const DIST_DIR = path.resolve(process.cwd(), "dist");
const SSR_DIR = path.resolve(process.cwd(), "dist-server");

// ---------- Step 1: Find the built SSR entry file ----------
async function findSsrEntry() {
  const preferred = path.join(SSR_DIR, "entry-server.js");
  if (existsSync(preferred)) return preferred;

  // Fallback: just grab whichever .js file Vite produced, in case the
  // output name ever changes.
  const files = await readdir(SSR_DIR);
  const jsFile = files.find((f) => f.endsWith(".js"));
  if (!jsFile) {
    throw new Error(`Could not find a built SSR entry file in ${SSR_DIR}`);
  }
  return path.join(SSR_DIR, jsFile);
}

// ---------- Step 2: Fetch every route that needs a page ----------
async function getRoutes() {
  const routes = ["/", "/shop", "/categories"];

  try {
    const productsRes = await fetch(`${API_BASE}/Product?sort=newest`);
    const products = await productsRes.json();
    for (const p of products) {
      if (p.urlName) routes.push(`/product/${p.urlName}`);
    }
  } catch (err) {
    console.error("Failed to fetch products for prerendering:", err.message);
  }

  try {
    const categoriesRes = await fetch(`${API_BASE}/Product/Categories`);
    const categories = await categoriesRes.json();
    for (const c of categories) {
      if (c.urlName) routes.push(`/shop?category=${c.urlName}`);
    }
  } catch (err) {
    console.error("Failed to fetch categories for prerendering:", err.message);
  }

  return [...new Set(routes)];
}

// ---------- Step 3: Turn a route into a file path inside dist/ ----------
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

// ---------- Main ----------
async function main() {
  console.log("Locating built SSR entry...");
  const ssrEntryPath = await findSsrEntry();
  const { render } = await import(`file://${ssrEntryPath}`);

  console.log("Reading client HTML template...");
  const template = await readFile(path.join(DIST_DIR, "index.html"), "utf-8");

  console.log("Fetching routes from API...");
  const routes = await getRoutes();
  console.log(`Found ${routes.length} routes to render.`);

  const failures = [];

  for (const route of routes) {
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
}

main().catch((err) => {
  console.error("SSR prerender script failed:", err);
  process.exit(1);
});
