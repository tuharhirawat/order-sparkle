// scripts/prerender.mjs
//
// Runs AFTER `vite build`. It:
// 1. Fetches all products + categories from your live API
// 2. Starts a local static server for the built `dist` folder
// 3. Uses Puppeteer to visit every important route
// 4. Waits for your API data to actually render on screen
// 5. Saves the final HTML back into `dist` as real static files
//
// Usage (already wired into package.json): npm run build

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.mamtasimitationjewellery.com/api";
const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
const DIST_DIR = path.resolve(process.cwd(), "dist");

// ---------- Step 1: Fetch routes to prerender ----------
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

  // de-duplicate just in case
  return [...new Set(routes)];
}

// ---------- Step 2: Start a local static server for dist/ ----------
async function waitForServerReady(url, timeoutMs = 30000, intervalMs = 300) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true; // server is responding
    } catch {
      // not up yet, keep trying
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Preview server did not become ready within ${timeoutMs}ms`);
}

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(
      "npx",
      ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort"],
      { shell: true, stdio: "pipe" }
    );

    server.stdout.on("data", (data) => process.stdout.write(data));
    server.stderr.on("data", (data) => process.stderr.write(data));
    server.on("error", reject);

    // Actually poll the server instead of guessing when it's ready.
    waitForServerReady(PREVIEW_URL)
      .then(() => resolve(server))
      .catch((err) => {
        server.kill();
        reject(err);
      });
  });
}

// ---------- Step 3: Turn a route into a file path inside dist/ ----------
function routeToFilePath(route) {
  // "/" -> dist/index.html
  // "/shop" -> dist/shop/index.html
  // "/shop?category=necksets" -> dist/shop/category/necksets/index.html
  // "/product/gold-necklace" -> dist/product/gold-necklace/index.html
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

const PRODUCTION_ORIGIN = "https://www.mamtasimitationjewellery.com";

// ---------- Browser launcher: works both locally (Windows/Mac) and on Vercel's Linux build container ----------
async function launchBrowser() {
  if (process.env.VERCEL) {
    // On Vercel: use a Chromium build made specifically for serverless/build containers.
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Locally: use regular Puppeteer, which downloads its own Chromium on npm install.
    const puppeteer = (await import("puppeteer")).default;
    return puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

// ---------- Step 4: Prerender each route with Puppeteer ----------
async function prerenderRoutes(routes) {
  const browser = await launchBrowser();

  for (const route of routes) {
    const page = await browser.newPage();

    // Surface browser console errors and network failures in our terminal,
    // so CORS issues / JS errors are visible instead of silently producing empty HTML.
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.warn(`  [browser console error] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.warn(`  [browser page error] ${err.message}`);
    });
    page.on("requestfailed", (req) => {
      console.warn(`  [request failed] ${req.url()} - ${req.failure()?.errorText}`);
    });

    try {
      const url = `${PREVIEW_URL}${route}`;
      console.log(`Prerendering: ${route}`);

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Extra safety wait: give React a moment to paint after last network call.
      await new Promise((r) => setTimeout(r, 1000));

      let html = await page.content();

      // Fix asset/preload URLs that got hardcoded to the local preview server
      // during prerendering — they must point to the real production domain.
      html = html.split(PREVIEW_URL).join(PRODUCTION_ORIGIN);

      const filePath = routeToFilePath(route);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, html, "utf-8");

      console.log(`  -> saved ${filePath}`);
    } catch (err) {
      console.error(`  !! failed to prerender ${route}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

// ---------- Main ----------
async function main() {
  console.log("Fetching routes from API...");
  const routes = await getRoutes();
  console.log(`Found ${routes.length} routes to prerender.`);

  console.log("Starting local preview server...");
  const server = await startPreviewServer();

  try {
    await prerenderRoutes(routes);
  } finally {
    server.kill();
  }

  console.log("Prerendering complete.");
}

main().catch((err) => {
  console.error("Prerender script failed:", err);
  process.exit(1);
});
