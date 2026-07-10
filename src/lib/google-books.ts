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

import { isRateLimitStatus, logGoogleBooksServerFetchFailure } from "@/lib/google-books-errors";
import { isGoogleBooksCircuitOpen } from "@/lib/google-books-circuit";
import {
  buildGoogleParams,
  buildStrictIntitleQuery,
  fetchGoogleVolumeById,
  fetchGoogleVolumesByIsbn,
  fetchVolumeDescriptionById,
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
    logGoogleBooksServerFetchFailure(query, `HTTP ${res.status}`);
    return [];
  }

  if (!res.ok) {
    logGoogleBooksServerFetchFailure(query, `HTTP ${res.status}`);
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

/**
 * When the linked volume has no description, search sibling editions
 * (same title/author) and take the longest volumeInfo.description found.
 */
async function findDescriptionAcrossEditions(
  title: string,
  author: string,
  options?: {
    seedVolumes?: GoogleVolume[];
    googleBooksId?: string | null;
    isbn?: string | null;
    includeEditionSearch?: boolean;
  },
): Promise<string | null> {
  let volumes = [...(options?.seedVolumes ?? [])];

  if (options?.googleBooksId) {
    const byId = await fetchGoogleVolumeById(options.googleBooksId);
    if (byId) volumes = mergeGoogleVolumes(volumes, [byId]);
  }

  let description = bestDescriptionFromVolumes(volumes);
  if (description) return description;

  const isbn =
    options?.isbn ??
    (volumes[0] ? primaryIsbnFromVolume(volumes[0]) : null);

  if (isbn) {
    const byIsbn = await fetchGoogleVolumesByIsbn(isbn);
    volumes = mergeGoogleVolumes(volumes, byIsbn);
    description = bestDescriptionFromVolumes(volumes);
    if (description) return description;
  }

  if (options?.includeEditionSearch !== false && title.trim()) {
    const editions = await searchEditionsForBook(title, author);
    volumes = mergeGoogleVolumes(volumes, editions);
    description = bestDescriptionFromVolumes(volumes);
    if (description) return description;
  }

  return fetchOpenLibraryDescription(title, author);
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
    description = await findDescriptionAcrossEditions(title, author, {
      seedVolumes: volumes,
      googleBooksId,
      isbn,
      includeEditionSearch: true,
    });
  }

  return ensureBookDescription(description);
}

async function enrichFromOpenLibraryDirect(
  books: BookSearchResult[],
): Promise<void> {
  const groups = new Map<string, BookSearchResult[]>();

  for (const book of books) {
    const key = `${normalizeTitle(book.title)}|${primaryAuthor(book.author).toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(book);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (!group.every((book) => !hasRealDescription(book.description))) continue;

    const sample = group[0];
    if (!sample) continue;

    const description = await fetchOpenLibraryDescription(
      sample.title,
      sample.author,
    );
    if (!description) continue;

    for (const book of group) {
      book.description = description;
    }
  }
}

async function enrichDescriptionGroup(
  group: BookSearchResult[],
): Promise<void> {
  const sample = group[0];
  if (!sample || isGoogleBooksCircuitOpen()) return;

  const isbn = sample.isbn13 ?? sample.isbn10 ?? null;
  const googleBooksId = sample.id.startsWith("ol-") ? null : sample.id;

  if (googleBooksId) {
    const direct = await fetchVolumeDescriptionById(googleBooksId);
    if (direct) {
      for (const book of group) {
        book.description = direct;
      }
      return;
    }
  }

  const acrossEditions = await findDescriptionAcrossEditions(
    sample.title,
    sample.author,
    {
      googleBooksId,
      isbn,
      includeEditionSearch: true,
    },
  );

  if (acrossEditions) {
    for (const book of group) {
      book.description = acrossEditions;
    }
    return;
  }

  let volumes: GoogleVolume[] = [];
  if (googleBooksId) {
    const byId = await fetchGoogleVolumeById(googleBooksId);
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
    googleBooksId,
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
    await enrichFromOpenLibraryDirect(editions);
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

/**
 * Direct GET /volumes/{id} — reads volumeInfo.description only, then Open
 * Library if that field is empty. Never uses search snippets.
 */
export async function fetchGoogleBookMetadataByVolumeId(
  volumeId: string,
): Promise<BookMetadataResult | null> {
  if (isGoogleBooksCircuitOpen() || !volumeId.trim()) return null;

  const volume = await fetchGoogleVolumeById(volumeId.trim());
  if (!volume) return null;

  const info = volume.volumeInfo;
  const title = info?.title ?? "";
  const author = info?.authors?.join(", ") ?? "Unknown Author";

  let description = descriptionFromVolume(volume);
  if (!description && title) {
    description = await findDescriptionAcrossEditions(title, author, {
      seedVolumes: [volume],
      googleBooksId: volume.id,
      isbn: primaryIsbnFromVolume(volume),
      includeEditionSearch: true,
    });
  }

  if (!description && title.trim()) {
    description = await fetchOpenLibraryDescription(title, author);
  }

  const patch = volumeToBookPatch(volume);
  const apiCategories = ensureBookCategories(patch.categories ?? []);
  const displayDescription = ensureBookDescription(description);

  return {
    pageCount: patch.pageCount ?? null,
    description: displayDescription,
    coverUrl: patch.coverUrl ?? null,
    googleBooksId: volume.id,
    apiCategories,
    categories: categoriesFromApi(
      apiCategories,
      displayDescription,
      title,
      author,
    ),
    isbn13: patch.isbn13 ?? null,
    isbn10: patch.isbn10 ?? null,
  };
}

export async function fetchGoogleBookMetadata(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
  isbn?: string | null;
  lite?: boolean;
}): Promise<BookMetadataResult | null> {
  const resolvedTitle = input.title.trim();
  const resolvedAuthor = input.author.trim() || "Unknown Author";

  if (!resolvedTitle && !input.googleBooksId && !input.isbn) {
    return null;
  }

  if (isGoogleBooksCircuitOpen()) {
    if (!resolvedTitle) return null;
    return buildOpenLibraryOnlyMetadata(
      resolvedTitle,
      resolvedAuthor,
      input.googleBooksId,
    );
  }

  if (input.googleBooksId) {
    const byVolume = await fetchGoogleBookMetadataByVolumeId(
      input.googleBooksId,
    );
    if (byVolume && hasRealDescription(byVolume.description)) {
      return byVolume;
    }
  }

  let volumes: GoogleVolume[] = [];
  let title = resolvedTitle;
  let author = resolvedAuthor;

  if (input.googleBooksId) {
    const byId = await fetchGoogleVolumeById(input.googleBooksId);
    if (byId) {
      volumes = [byId];
      if (!title) {
        title = byId.volumeInfo?.title ?? "";
      }
      if (!author.trim()) {
        author = byId.volumeInfo?.authors?.join(", ") ?? "Unknown Author";
      }
    }
  }

  if (!volumes.length && input.isbn) {
    volumes = await fetchGoogleVolumesByIsbn(input.isbn);
  }

  if (!volumes.length && title) {
    volumes = await searchEditionsForBook(title, author);
  }

  const best = pickBestVolume(volumes);
  if (!best) {
    if (!title) return null;
    return buildOpenLibraryOnlyMetadata(title, author, input.googleBooksId);
  }

  const patch = volumeToBookPatch(best);
  const apiCategories = ensureBookCategories(patch.categories ?? []);
  const isbn =
    input.isbn ??
    patch.isbn13 ??
    patch.isbn10 ??
    primaryIsbnFromVolume(best);
  const description = await resolveBookDescription(
    volumes,
    title,
    author,
    input.googleBooksId ?? best.id,
    isbn,
    { lite: input.lite },
  );

  if (!hasRealDescription(description) && title) {
    const openLibraryDescription = await fetchOpenLibraryDescription(
      title,
      author,
    );
    if (openLibraryDescription) {
      return {
        pageCount: patch.pageCount ?? null,
        description: ensureBookDescription(openLibraryDescription),
        coverUrl: patch.coverUrl ?? null,
        googleBooksId: best.id,
        apiCategories,
        categories: categoriesFromApi(
          apiCategories,
          openLibraryDescription,
          title,
          author,
        ),
        isbn13: patch.isbn13 ?? null,
        isbn10: patch.isbn10 ?? null,
      };
    }
  }

  return {
    pageCount: patch.pageCount ?? null,
    description,
    coverUrl: patch.coverUrl ?? null,
    googleBooksId: best.id,
    apiCategories,
    categories: categoriesFromApi(
      apiCategories,
      description,
      title,
      author,
    ),
    isbn13: patch.isbn13 ?? null,
    isbn10: patch.isbn10 ?? null,
  };
}

async function buildOpenLibraryOnlyMetadata(
  title: string,
  author: string,
  googleBooksId?: string | null,
): Promise<BookMetadataResult | null> {
  const description = await fetchOpenLibraryDescription(title, author);
  if (!description) return null;

  return {
    pageCount: null,
    description: ensureBookDescription(description),
    coverUrl: null,
    googleBooksId: googleBooksId ?? null,
    apiCategories: [],
    categories: categoriesFromApi([], description, title, author),
    isbn13: null,
    isbn10: null,
  };
}
