const PAGE_SIZE = 20;
const BATCH_SIZE = 40;

export const PRODUCT_IMAGE_LIMITS = Object.freeze({
  maxCount: 3,
  maxTotalSizeBytes: 10 * 1024 * 1024,
});

export const PAGE_SIZE_LIMITS = Object.freeze({
  pageSize: PAGE_SIZE,
  batchSize: BATCH_SIZE, // must be a multiple of PAGE_SIZE;
  pagesPerBatch: BATCH_SIZE / PAGE_SIZE,
});