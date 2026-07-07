import type { BookEntry, BookSearchResult } from "@/lib/types";
import { getGoogleBooksApiKey } from "@/lib/google-books-api-key";
import {
  bestDescriptionFromTexts,
  cleanDescription,
  ensureBookDescription,
} from "@/lib/book-descriptions";
import {
  isPlausiblePageCount,
  medianPageCount,
  pickMedianPageCount,
  sanitizePageCount,
} from "@/lib/page-count";
import {
  bookHasDisplayableCover,
  filterBooksWithDisplayableCovers,
  normalizeCoverUrl,
} from "@/lib/cover-url";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

export interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export interface GoogleBooksResponse {
  items?: GoogleVolume[];
}

export {
  bookHasDisplayableCover,
  filterBooksWithDisplayableCovers,
  isValidCoverUrl,
  normalizeCoverUrl,
  resolveCoverUrl,
  upsampleCoverUrl,
} from "@/lib/cover-url";

export function primaryAuthor(author: string): string {
  return author.split(",")[0]?.trim() ?? author;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter.slice(0, Math.max(8, shorter.length)));
}

/** True when volume metadata or title text indicates English. */
export function isEnglishVolume(volume: GoogleVolume): boolean {
  const lang = volume.volumeInfo?.language?.toLowerCase() ?? "";
  if (lang === "en" || lang.startsWith("en-")) return true;
  return isMostlyLatinTitle(volume.volumeInfo?.title ?? "");
}

/** Prefer English/Latin-script titles for catalog display. */
export function isMostlyLatinTitle(title: string): boolean {
  const letters = title.match(/\p{L}/gu);
  if (!letters || letters.length === 0) return true;
  const latin = title.match(/[A-Za-z\u00C0-\u024F]/g);
  return (latin?.length ?? 0) / letters.length >= 0.85;
}

export function englishTitleScore(title: string): number {
  return isMostlyLatinTitle(title) ? 25 : 0;
}

export function resolveGoogleVolumeThumbnail(
  volume: GoogleVolume,
): string | null {
  const links = volume.volumeInfo?.imageLinks;
  if (!links) return null;

  const candidates = [links.thumbnail, links.smallThumbnail];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const normalized = normalizeCoverUrl(trimmed);
    if (normalized) return normalized;
  }

  return null;
}

export function googleVolumeHasThumbnail(volume: GoogleVolume): boolean {
  return resolveGoogleVolumeThumbnail(volume) !== null;
}

export function onlyWithCover(books: BookSearchResult[]): BookSearchResult[] {
  return filterBooksWithDisplayableCovers(books, "list");
}

export function editionLabel(volume: GoogleVolume): string {
  const info = volume.volumeInfo;
  const parts: string[] = [];
  if (info?.publishedDate) {
    parts.push(info.publishedDate.slice(0, 4));
  }
  if (info?.pageCount && isPlausiblePageCount(info.pageCount)) {
    parts.push(`${info.pageCount} pages`);
  } else if (info?.pageCount && info.pageCount > 0) {
    parts.push(`~${info.pageCount} pages (unverified)`);
  }
  if (info?.subtitle) {
    parts.push(info.subtitle);
  }
  return parts.length > 0 ? parts.join(" · ") : "Edition";
}

export function mapGoogleVolume(item: GoogleVolume): BookSearchResult {
  const info = item.volumeInfo;
  const coverUrl = resolveGoogleVolumeThumbnail(item);
  return {
    id: item.id,
    title: info?.title ?? "Unknown Title",
    subtitle: info?.subtitle ?? null,
    author: info?.authors?.join(", ") ?? "Unknown Author",
    coverUrl,
    description: ensureBookDescription(info?.description),
    pageCount: sanitizePageCount(info?.pageCount),
    categories: (info?.categories ?? []).map((c) => c.trim()).filter(Boolean),
    editionLabel: editionLabel(item),
    publishedDate: info?.publishedDate ?? null,
  };
}

export function pickBestVolume(volumes: GoogleVolume[]): GoogleVolume | null {
  if (!volumes.length) return null;

  const englishFirst = volumes.filter(isEnglishVolume);
  const pool = englishFirst.length > 0 ? englishFirst : volumes;

  const pageCounts = pool
    .map((v) => v.volumeInfo?.pageCount ?? 0)
    .filter((p) => p > 0);

  const targetPages = pickMedianPageCount(pageCounts);
  const plausible = pool.filter((v) =>
    isPlausiblePageCount(v.volumeInfo?.pageCount ?? 0),
  );
  const candidates = plausible.length > 0 ? plausible : pool;

  if (targetPages != null) {
    return candidates.reduce((best, current) => {
      const bestPages = best.volumeInfo?.pageCount ?? 0;
      const currentPages = current.volumeInfo?.pageCount ?? 0;
      const bestDist = Math.abs(bestPages - targetPages);
      const currentDist = Math.abs(currentPages - targetPages);
      if (currentDist < bestDist) return current;
      if (currentDist === bestDist && currentPages > bestPages) return current;
      return best;
    });
  }

  return candidates.reduce((best, current) => {
    const bestPages = best.volumeInfo?.pageCount ?? 0;
    const currentPages = current.volumeInfo?.pageCount ?? 0;
    return currentPages > bestPages ? current : best;
  });
}

/** For search results: prefer median plausible page count per title+author group. */
export function refineSearchResults(
  books: BookSearchResult[],
): BookSearchResult[] {
  const groups = new Map<string, BookSearchResult[]>();

  for (const book of books) {
    const key = `${normalizeTitle(book.title)}|${primaryAuthor(book.author).toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(book);
    groups.set(key, list);
  }

  const refined: BookSearchResult[] = [];

  for (const group of groups.values()) {
    const counts = group
      .map((b) => b.pageCount ?? 0)
      .filter((p) => p > 0);
    const med = medianPageCount(counts);
    const bestDescription = bestDescriptionFromTexts(
      group.map((book) => book.description),
    );

    for (const book of group) {
      const description = ensureBookDescription(
        cleanDescription(book.description) ?? bestDescription,
      );
      const nextBook = { ...book, description };

      if (book.pageCount != null && !isPlausiblePageCount(book.pageCount)) {
        refined.push({ ...nextBook, pageCount: med });
      } else {
        refined.push(nextBook);
      }
    }
  }

  return refined;
}

export function buildGoogleParams(
  extra?: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams(extra);
  params.set("hl", "en");
  const apiKey = getGoogleBooksApiKey();
  if (apiKey) params.set("key", apiKey);
  return params;
}

/** Trim and collapse whitespace — passed directly as Google Books `q`. */
export function normalizeBookSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function titleRelevanceScore(title: string, query: string): number {
  const normalizedQuery = normalizeTitle(query);
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedQuery || !normalizedTitle) return 0;

  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  if (
    normalizedQuery.startsWith(normalizedTitle) &&
    normalizedTitle.length >= 4
  ) {
    return 85;
  }
  if (
    normalizedTitle.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedTitle)
  ) {
    return 70;
  }

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1);
  const titleLower = title.toLowerCase();
  const wordHits = queryWords.filter((word) => titleLower.includes(word)).length;

  return wordHits > 0 ? 40 + wordHits * 15 : 0;
}

/** Preserve Google's relevance order while nudging exact title matches upward. */
export function rankSearchResultsByRelevance(
  books: BookSearchResult[],
  query: string,
): BookSearchResult[] {
  return [...books]
    .map((book, index) => ({
      book,
      index,
      score: titleRelevanceScore(book.title, query) + englishTitleScore(book.title),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map(({ book }) => book);
}

export async function fetchGoogleVolumes(
  query: string,
  maxResults = 20,
): Promise<GoogleVolume[]> {
  const params = buildGoogleParams({
    q: query,
    maxResults: String(maxResults),
    printType: "books",
    orderBy: "relevance",
    projection: "full",
  });

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as GoogleBooksResponse;
  return data.items ?? [];
}

export async function fetchGoogleVolumeById(
  id: string,
): Promise<GoogleVolume | null> {
  const params = buildGoogleParams();
  const response = await fetch(`${GOOGLE_BOOKS_API}/${id}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as GoogleVolume;
}

export async function searchEditionsForBook(
  title: string,
  author: string,
): Promise<GoogleVolume[]> {
  const primary = primaryAuthor(author);
  const volumes = await fetchGoogleVolumes(
    `intitle:"${title}" inauthor:"${primary}"`,
    25,
  );

  const matched = volumes.filter((v) => {
    const volTitle = v.volumeInfo?.title ?? "";
    const volAuthors = v.volumeInfo?.authors ?? [];
    return (
      titlesMatch(volTitle, title) &&
      volAuthors.some((a) =>
        a.toLowerCase().includes(primary.toLowerCase().split(" ")[0] ?? ""),
      )
    );
  });

  return matched.length > 0 ? matched : volumes;
}

export function volumeToBookPatch(
  volume: GoogleVolume,
): Partial<BookEntry> & { pageCount: number | null } {
  const mapped = mapGoogleVolume(volume);
  return {
    pageCount: mapped.pageCount,
    description: mapped.description,
    categories: mapped.categories,
    coverUrl: mapped.coverUrl,
    googleBooksId: volume.id,
  };
}

export {
  descriptionFromVolume,
  bestDescriptionFromVolumes,
} from "@/lib/book-descriptions";

/** Sort search results: editions with page counts first, highest pages first. */
export function sortEditionsForDisplay(
  books: BookSearchResult[],
): BookSearchResult[] {
  return [...books].sort((a, b) => {
    const aHas = a.pageCount != null && a.pageCount > 0 ? 1 : 0;
    const bHas = b.pageCount != null && b.pageCount > 0 ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    return (b.pageCount ?? 0) - (a.pageCount ?? 0);
  });
}

/** For recommendations: one entry per title, prefer most pages. */
export function dedupeByTitlePreferMostPages(
  books: BookSearchResult[],
): BookSearchResult[] {
  const byTitle = new Map<string, BookSearchResult>();
  for (const book of books) {
    const key = normalizeTitle(book.title);
    const existing = byTitle.get(key);
    if (
      !existing ||
      (book.pageCount ?? 0) > (existing.pageCount ?? 0)
    ) {
      byTitle.set(key, book);
    }
  }
  return [...byTitle.values()];
}
