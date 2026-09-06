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

import { spawn, exec } from "node:child_process";
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

// Force-kills the preview server AND any child process it spawned.
// On Windows, spawning through a shell wraps the real process, so a plain
// .kill() only kills the wrapper and leaves vite/chrome running in the
// background — which both blocks the port on the next run AND can prevent
// this whole script from exiting (silently breaking any "&&" step after it).
function killServerTree(server) {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec(`taskkill /pid ${server.pid} /T /F`, () => resolve());
    } else {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
      resolve();
    }
  });
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

// How many pages to prerender at once. Higher = faster overall, but uses
// more memory/CPU on the build machine. 5 is a safe starting point; raise
// it if your catalog grows into the hundreds and builds get slow.
const CONCURRENCY = 5;

// Console/network noise that is EXPECTED during prerendering (no logged-in
// user exists, so the "am I logged in?" check always fails) and isn't a
// real problem — filtered out so real errors are easier to spot.
function isExpectedNoise(text) {
  return (
    text.includes("Auth/Me") ||
    text.includes("Failed to refresh user") ||
    text.includes("401") ||
    text.includes("Failed to load module script") ||
    text.includes("modulepreload")
  );
}

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

async function prerenderOneRoute(browser, route, attempt = 1) {
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" && !isExpectedNoise(msg.text())) {
      console.warn(`  [${route}] [browser console error] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.warn(`  [${route}] [browser page error] ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    if (!isExpectedNoise(req.url())) {
      console.warn(`  [${route}] [request failed] ${req.url()} - ${req.failure()?.errorText}`);
    }
  });

  try {
    const url = `${PREVIEW_URL}${route}`;
    // A little extra headroom than the default, since several pages may be
    // loading through the same preview server at once.
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    // Extra safety wait: give React a moment to paint after last network call.
    await new Promise((r) => setTimeout(r, 1000));

    let html = await page.content();

    // Fix asset/preload URLs that got hardcoded to the local preview server
    // during prerendering — they must point to the real production domain.
    html = html.split(PREVIEW_URL).join(PRODUCTION_ORIGIN);

    const filePath = routeToFilePath(route);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, html, "utf-8");

    console.log(`Prerendered: ${route} -> saved`);
  } catch (err) {
    await page.close().catch(() => {});
    if (attempt < 2) {
      console.warn(`  [${route}] attempt ${attempt} failed (${err.message}), retrying...`);
      return prerenderOneRoute(browser, route, attempt + 1);
    }
    console.error(`!! failed to prerender ${route} after ${attempt} attempts:`, err.message);
    return;
  }
  await page.close().catch(() => {});
}

// ---------- Step 4: Prerender routes with Puppeteer, several at a time ----------
async function prerenderRoutes(routes) {
  const browser = await launchBrowser();

  // Process routes in batches of CONCURRENCY, so we're never running more
  // than a handful of headless browser tabs at once (keeps memory usage sane)
  // while still being much faster than doing them one at a time.
  for (let i = 0; i < routes.length; i += CONCURRENCY) {
    const batch = routes.slice(i, i + CONCURRENCY);
    console.log(`Prerendering batch ${i / CONCURRENCY + 1} (${batch.length} routes)...`);
    await Promise.all(batch.map((route) => prerenderOneRoute(browser, route)));
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
    await killServerTree(server);
  }

  console.log("Prerendering complete.");
}

main().catch((err) => {
  console.error("Prerender script failed:", err);
  process.exit(1);
});
