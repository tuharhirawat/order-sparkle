// scripts/generate-sitemap.mjs
//
// Generates a sitemap.xml listing your homepage, shop, categories,
// and every individual product page — using the same API your
// prerender script already calls, so it always reflects live data.
//
// Usage: node scripts/generate-sitemap.mjs
// Run this AFTER `vite build`, so it writes into your dist/ folder
// alongside your prerendered pages. Already wired into your build
// command below.

import { writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.mamtasimitationjewellery.com/api";
const SITE_URL = "https://www.mamtasimitationjewellery.com";
const DIST_DIR = path.resolve(process.cwd(), "dist");

async function getUrls() {
  const urls = [
    { path: "/", priority: "1.0" },
    { path: "/shop", priority: "0.9" },
    { path: "/categories", priority: "0.8" },
  ];

  try {
    const productsRes = await fetch(`${API_BASE}/Product?sort=newest`);
    const products = await productsRes.json();
    for (const p of products) {
      if (p.urlName) {
        urls.push({ path: `/product/${p.urlName}`, priority: "0.7" });
      }
    }
  } catch (err) {
    console.error("Failed to fetch products for sitemap:", err.message);
  }

  try {
    const categoriesRes = await fetch(`${API_BASE}/Product/Categories`);
    const categories = await categoriesRes.json();
    for (const c of categories) {
      if (c.urlName) {
        urls.push({ path: `/shop?category=${c.urlName}`, priority: "0.6" });
      }
    }
  } catch (err) {
    console.error("Failed to fetch categories for sitemap:", err.message);
  }

  return urls;
}

function buildXml(urls) {
  const today = new Date().toISOString().split("T")[0];
  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function main() {
  console.log("Building sitemap...");
  const urls = await getUrls();
  const xml = buildXml(urls);
  const filePath = path.join(DIST_DIR, "sitemap.xml");
  await writeFile(filePath, xml, "utf-8");
  console.log(`Sitemap written with ${urls.length} URLs -> ${filePath}`);
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
