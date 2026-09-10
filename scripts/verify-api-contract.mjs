// scripts/verify-api-contract.mjs
//
// Runs FIRST, before any other build step. Hits the live API directly
// (not through catalog.ts, deliberately — this is the one place that
// should NOT trust the frontend's own types, since the whole point is
// to catch cases where the backend has drifted out from under them) and
// asserts the response shapes the rest of the build depends on.
//
// If the backend changes independently of the frontend (a field renamed,
// a wrapper shape changed), this fails in ~2 seconds with a precise
// message — instead of the build failing 90 seconds later, mid-prerender,
// with a vague "X is not iterable".

const API_BASE = process.env.API_BASE ?? "https://api.mamtasimitationjewellery.com/api";

async function assertShape(name, url, checkFn) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  checkFn(data);
  console.log(`✓ ${name}`);
}

async function main() {
  await assertShape("GET /Product", `${API_BASE}/Product?page=1&pageSize=1`, (data) => {
    if (!Array.isArray(data.items)) throw new Error("expected data.items: array");
    if (typeof data.totalPages !== "number") throw new Error("expected data.totalPages: number");
    if (typeof data.totalCount !== "number") throw new Error("expected data.totalCount: number");
    if (typeof data.page !== "number") throw new Error("expected data.page: number");
    if (typeof data.pageSize !== "number") throw new Error("expected data.pageSize: number");
  });

  await assertShape("GET /Product/Categories", `${API_BASE}/Product/Categories`, (data) => {
    if (!Array.isArray(data)) throw new Error("expected an array");
  });
}

main().catch((err) => {
  console.error(`✗ API contract check failed: ${err.message}`);
  console.error("  The backend response shape has changed. Update src/Types/productTypes.ts,");
  console.error("  src/lib/catalog.ts, and this script to match before rebuilding.");
  process.exit(1);
});
