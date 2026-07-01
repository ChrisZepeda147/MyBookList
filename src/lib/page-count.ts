/** Validate and normalize page counts from Google Books API. */

const MIN_PAGES = 20;
const MAX_PAGES = 2500;

export function isPlausiblePageCount(count: number): boolean {
  return Number.isFinite(count) && count >= MIN_PAGES && count <= MAX_PAGES;
}

export function sanitizePageCount(
  raw: number | undefined | null,
): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  const rounded = Math.round(raw);
  return isPlausiblePageCount(rounded) ? rounded : null;
}

export function medianPageCount(counts: number[]): number | null {
  const plausible = counts.filter(isPlausiblePageCount);
  if (!plausible.length) return null;
  const sorted = [...plausible].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Pick the edition whose page count is closest to the median of plausible values. */
export function pickMedianPageCount(counts: number[]): number | null {
  const med = medianPageCount(counts);
  if (med == null) return null;
  const plausible = counts.filter(isPlausiblePageCount);
  return plausible.reduce((best, cur) =>
    Math.abs(cur - med) < Math.abs(best - med) ? cur : best,
  );
}
