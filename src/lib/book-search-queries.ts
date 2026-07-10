import { normalizeBookSearchQuery } from "@/lib/google-books-client";

/** Fantasy-title typo: readers often say "bond" for "bound" (e.g. Dire Bound). */
function swapBondBound(text: string): string | null {
  if (/\bbond\b/i.test(text)) {
    return text.replace(/\bbond\b/gi, "bound");
  }
  if (/\bbound\b/i.test(text)) {
    return text.replace(/\bbound\b/gi, "bond");
  }
  return null;
}

/** Unique search strings to try against book catalogs (original + common variants). */
export function expandBookSearchQueries(raw: string): string[] {
  const base = normalizeBookSearchQuery(raw);
  if (!base) return [];

  const queries = new Set<string>([base]);
  const swapped = swapBondBound(base);
  if (swapped) queries.add(swapped);

  return [...queries];
}

/** Google Books `q` values — general + tighter title-focused queries. */
export function buildGoogleBookSearchQueries(raw: string): string[] {
  const expanded = expandBookSearchQueries(raw);
  const queries = new Set<string>();

  for (const q of expanded) {
    queries.add(q);
    const words = q.split(/\s+/).filter((word) => word.length > 0);
    if (words.length >= 2) {
      queries.add(`intitle:"${q}"`);
      queries.add(words.map((word) => `intitle:${word}`).join(" "));
    }
  }

  return [...queries];
}

/** Open Library `q` values — keyword + title-weighted passes. */
export function buildOpenLibrarySearchQueries(raw: string): string[] {
  const expanded = expandBookSearchQueries(raw);
  const queries = new Set<string>();

  for (const q of expanded) {
    queries.add(q);
    const words = q.split(/\s+/).filter((word) => word.length > 0);
    if (words.length >= 2) {
      queries.add(`title:${q}`);
    }
  }

  return [...queries];
}
