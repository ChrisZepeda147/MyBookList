import type { BookSearchResult } from "@/lib/types";
import {
  categoriesFromApi,
  ensureBookCategories,
} from "@/lib/categories";
import {
  bestDescriptionFromVolumes,
  descriptionFromVolume,
  ensureBookDescription,
  hasRealDescription,
} from "@/lib/book-descriptions";
import { expandBookSearchQueries } from "@/lib/book-search-queries";
import { fetchOpenLibraryDescription } from "@/lib/open-library";
import {
  BOOK_SEARCH_TIMEOUT_MS,
  fetchWithTimeout,
  isFetchTimeoutError,
} from "@/lib/fetch-with-timeout";

import {
  isGoogleBooksCircuitOpen,
  tripGoogleBooksCircuit,
} from "@/lib/google-books-circuit";
import { isRateLimitStatus } from "@/lib/google-books-errors";
import {
  buildGoogleParams,
  buildStrictIntitleQuery,
  fetchGoogleVolumeById,
  fetchGoogleVolumesByIsbn,
  googleVolumeHasThumbnail,
  mapGoogleVolume,
  mergeGoogleVolumes,
  normalizeBookSearchQuery,
  normalizeTitle,
  onlyWithCover,
  pickBestVolume,
  primaryAuthor,
  primaryIsbnFromVolume,
  rankSearchResultsByRelevance,
  refineSearchResults,
  searchEditionsForBook,
  volumeToBookPatch,
  type GoogleVolume,
} from "@/lib/google-books-client";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

/** Max title groups to enrich per search (avoids API bursts). */
const SEARCH_DESCRIPTION_ENRICH_LIMIT = 5;
/** Concurrent description enrichments during search. */
const SEARCH_DESCRIPTION_ENRICH_CONCURRENCY = 2;

function enrichSearchResult(item: GoogleVolume): BookSearchResult {
  const mapped = mapGoogleVolume(item);
  const apiCategories = ensureBookCategories(mapped.categories);
  return {
    ...mapped,
    apiCategories,
    categories: categoriesFromApi(
      apiCategories,
      mapped.description,
      mapped.title,
      mapped.author,
      mapped.subtitle,
    ),
  };
}

async function fetchVolumesWithRateLimit(
  query: string,
): Promise<GoogleVolume[]> {
  const params = buildGoogleParams({
    q: query,
    maxResults: "40",
    orderBy: "relevance",
    projection: "full",
    printType: "books",
  });

  const url = `${GOOGLE_BOOKS_API}?${params.toString()}`;
  const res = await fetchWithTimeout(url, {
    cache: "no-store",
    timeoutMs: BOOK_SEARCH_TIMEOUT_MS,
  });

  if (isRateLimitStatus(res.status)) {
    tripGoogleBooksCircuit();
    console.warn(
      "[google-books] Rate limited — circuit open for 1 hour.",
      res.status,
    );
    return [];
  }

  if (!res.ok) {
    throw new Error(`Google Books API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.items ?? []) as GoogleVolume[];
}

/**
 * Tier 1: strict intitle:"phrase" (exact title phrase).
 * Tier 2: loose keyword search if strict returns nothing.
 * Tries bond/bound spelling variants before falling back.
 */
async function fetchTieredGoogleVolumes(
  rawQuery: string,
): Promise<GoogleVolume[]> {
  if (isGoogleBooksCircuitOpen()) return [];

  const phrases = expandBookSearchQueries(rawQuery);

  for (const phrase of phrases) {
    const strict = await fetchVolumesWithRateLimit(buildStrictIntitleQuery(phrase));
    if (strict.length > 0) {
      return strict;
    }
  }

  let loose: GoogleVolume[] = [];
  for (const phrase of phrases) {
    const batch = await fetchVolumesWithRateLimit(phrase);
    loose = mergeGoogleVolumes(loose, batch);
  }
  return loose;
}

async function resolveBookDescription(
  volumes: GoogleVolume[],
  title: string,
  author: string,
  googleBooksId?: string | null,
  isbn?: string | null,
  options?: { lite?: boolean },
): Promise<string> {
  const lite = options?.lite ?? false;
  let description = bestDescriptionFromVolumes(volumes);

  if (!description && isbn) {
    const byIsbn = await fetchGoogleVolumesByIsbn(isbn);
    description = bestDescriptionFromVolumes(byIsbn);
  }

  if (!description && googleBooksId) {
    const byId = await fetchGoogleVolumeById(googleBooksId);
    description = descriptionFromVolume(byId);
    if (!description && byId) {
      const isbnFromVolume = primaryIsbnFromVolume(byId);
      if (isbnFromVolume && isbnFromVolume !== isbn) {
        const byIsbn = await fetchGoogleVolumesByIsbn(isbnFromVolume);
        description = bestDescriptionFromVolumes(byIsbn);
      }
    }
  }

  if (!description && !lite) {
    for (const volume of volumes.slice(0, 2)) {
      const full = await fetchGoogleVolumeById(volume.id);
      const next = descriptionFromVolume(full);
      if (next) {
        description = next;
        break;
      }
      const volumeIsbn = full ? primaryIsbnFromVolume(full) : null;
      if (!next && volumeIsbn) {
        const byIsbn = await fetchGoogleVolumesByIsbn(volumeIsbn);
        const isbnDesc = bestDescriptionFromVolumes(byIsbn);
        if (isbnDesc) {
          description = isbnDesc;
          break;
        }
      }
    }
  }

  if (!description) {
    description = await fetchOpenLibraryDescription(title, author);
  }

  return ensureBookDescription(description);
}

async function enrichDescriptionGroup(
  group: BookSearchResult[],
): Promise<void> {
  const sample = group[0];
  if (!sample || isGoogleBooksCircuitOpen()) return;

  const isbn = sample.isbn13 ?? sample.isbn10 ?? null;
  let volumes: GoogleVolume[] = [];

  if (!sample.id.startsWith("ol-")) {
    const byId = await fetchGoogleVolumeById(sample.id);
    if (byId) volumes = [byId];
  }

  if (!volumes.length && isbn) {
    volumes = await fetchGoogleVolumesByIsbn(isbn);
  }

  if (!volumes.length) {
    volumes = await searchEditionsForBook(sample.title, sample.author);
  }

  const description = await resolveBookDescription(
    volumes,
    sample.title,
    sample.author,
    sample.id.startsWith("ol-") ? null : sample.id,
    isbn,
    { lite: true },
  );

  if (!hasRealDescription(description)) return;

  for (const book of group) {
    book.description = description;
  }
}

async function enrichMissingDescriptions(
  books: BookSearchResult[],
): Promise<BookSearchResult[]> {
  if (isGoogleBooksCircuitOpen()) return books;

  const groups = new Map<string, BookSearchResult[]>();

  for (const book of books) {
    const key = `${normalizeTitle(book.title)}|${primaryAuthor(book.author).toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(book);
    groups.set(key, list);
  }

  const missingGroups = [...groups.values()].filter((group) =>
    group.every((book) => !hasRealDescription(book.description)),
  );

  const limited = missingGroups.slice(0, SEARCH_DESCRIPTION_ENRICH_LIMIT);

  for (let i = 0; i < limited.length; i += SEARCH_DESCRIPTION_ENRICH_CONCURRENCY) {
    if (isGoogleBooksCircuitOpen()) break;
    const chunk = limited.slice(i, i + SEARCH_DESCRIPTION_ENRICH_CONCURRENCY);
    await Promise.all(chunk.map((group) => enrichDescriptionGroup(group)));
  }

  return books;
}

export async function searchGoogleBooks(
  query: string,
): Promise<BookSearchResult[]> {
  const searchQuery = normalizeBookSearchQuery(query);
  if (!searchQuery) return [];

  try {
    const volumes = await fetchTieredGoogleVolumes(searchQuery);
    let editions = refineSearchResults(
      onlyWithCover(
        volumes
          .filter(googleVolumeHasThumbnail)
          .map(enrichSearchResult),
      ),
    );
    editions = await enrichMissingDescriptions(editions);
    return onlyWithCover(
      rankSearchResultsByRelevance(editions, searchQuery),
    );
  } catch (error) {
    if (!isFetchTimeoutError(error)) {
      console.error("Books API Error Details:", error, { query: searchQuery });
    }
    throw error;
  }
}

export interface BookMetadataResult {
  pageCount: number | null;
  description: string;
  coverUrl: string | null;
  googleBooksId: string | null;
  apiCategories: string[];
  categories: string[];
  isbn13: string | null;
  isbn10: string | null;
}

export async function fetchGoogleBookMetadata(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
  isbn?: string | null;
  lite?: boolean;
}): Promise<BookMetadataResult | null> {
  if (isGoogleBooksCircuitOpen()) return null;

  let volumes: GoogleVolume[] = [];

  if (input.googleBooksId) {
    const byId = await fetchGoogleVolumeById(input.googleBooksId);
    if (byId) volumes = [byId];
  }

  if (!volumes.length && input.isbn) {
    volumes = await fetchGoogleVolumesByIsbn(input.isbn);
  }

  if (!volumes.length) {
    volumes = await searchEditionsForBook(input.title, input.author);
  }

  const best = pickBestVolume(volumes);
  if (!best) return null;

  const patch = volumeToBookPatch(best);
  const apiCategories = ensureBookCategories(patch.categories ?? []);
  const isbn =
    input.isbn ??
    patch.isbn13 ??
    patch.isbn10 ??
    primaryIsbnFromVolume(best);
  const description = await resolveBookDescription(
    volumes,
    input.title,
    input.author,
    input.googleBooksId ?? best.id,
    isbn,
    { lite: input.lite },
  );

  return {
    pageCount: patch.pageCount ?? null,
    description,
    coverUrl: patch.coverUrl ?? null,
    googleBooksId: best.id,
    apiCategories,
    categories: categoriesFromApi(
      apiCategories,
      description,
      input.title,
      input.author,
    ),
    isbn13: patch.isbn13 ?? null,
    isbn10: patch.isbn10 ?? null,
  };
}
