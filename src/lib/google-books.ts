import type { BookSearchResult } from "@/lib/types";
import {
  categoriesFromApi,
  ensureBookCategories,
} from "@/lib/categories";
import {
  bestDescriptionFromVolumes,
  descriptionFromVolume,
  ensureBookDescription,
} from "@/lib/book-descriptions";
import { fetchOpenLibraryDescription } from "@/lib/open-library";
import {
  BOOK_SEARCH_TIMEOUT_MS,
  fetchWithTimeout,
  isFetchTimeoutError,
} from "@/lib/fetch-with-timeout";

import {
  tripGoogleBooksCircuit,
} from "@/lib/google-books-circuit";
import { isRateLimitStatus } from "@/lib/google-books-errors";
import {
  buildGoogleBooksSearchQuery,
  buildGoogleParams,
  fetchGoogleVolumeById,
  googleVolumeHasThumbnail,
  mapGoogleVolume,
  normalizeTitle,
  onlyWithCover,
  pickBestVolume,
  primaryAuthor,
  rankSearchResultsByRelevance,
  refineSearchResults,
  searchEditionsForBook,
  volumeToBookPatch,
} from "@/lib/google-books-client";

interface GoogleBooksResponse {
  items?: Parameters<typeof mapGoogleVolume>[0][];
}

function enrichSearchResult(
  item: Parameters<typeof mapGoogleVolume>[0],
): BookSearchResult {
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

async function resolveBookDescription(
  volumes: Parameters<typeof mapGoogleVolume>[0][],
  title: string,
  author: string,
  googleBooksId?: string | null,
): Promise<string> {
  let description = bestDescriptionFromVolumes(volumes);

  if (!description && googleBooksId) {
    const byId = await fetchGoogleVolumeById(googleBooksId);
    description = descriptionFromVolume(byId);
  }

  if (!description) {
    for (const volume of volumes.slice(0, 5)) {
      const full = await fetchGoogleVolumeById(volume.id);
      const next = descriptionFromVolume(full);
      if (next) {
        description = next;
        break;
      }
    }
  }

  if (!description) {
    description = await fetchOpenLibraryDescription(title, author);
  }

  return ensureBookDescription(description);
}

async function enrichMissingDescriptions(
  books: BookSearchResult[],
  limit = 6,
): Promise<BookSearchResult[]> {
  const groups = new Map<string, BookSearchResult[]>();

  for (const book of books) {
    const key = `${normalizeTitle(book.title)}|${primaryAuthor(book.author).toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(book);
    groups.set(key, list);
  }

  const missingGroups = [...groups.entries()].filter(([, group]) =>
    group.every((book) => !book.description?.trim()),
  );

  await Promise.all(
    missingGroups.slice(0, limit).map(async ([, group]) => {
      const sample = group[0];
      if (!sample) return;

      let volumes = await searchEditionsForBook(sample.title, sample.author);
      if (!sample.id.startsWith("ol-")) {
        const byId = await fetchGoogleVolumeById(sample.id);
        if (byId && !volumes.some((volume) => volume.id === byId.id)) {
          volumes = [byId, ...volumes];
        }
      }

      const description = await resolveBookDescription(
        volumes,
        sample.title,
        sample.author,
        sample.id.startsWith("ol-") ? null : sample.id,
      );

      if (!description) return;

      for (const book of group) {
        book.description = description;
      }
    }),
  );

  return books;
}

export async function searchGoogleBooks(
  query: string,
): Promise<BookSearchResult[]> {
  const searchQuery = query.trim();
  if (!searchQuery) return [];

  const params = buildGoogleParams({
    q: buildGoogleBooksSearchQuery(searchQuery),
    maxResults: "25",
    orderBy: "relevance",
    projection: "full",
  });

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;

  try {
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
      const error = new Error(`Google Books API error: ${res.status}`);
      console.error("Books API Error Details:", error, {
        status: res.status,
        query: searchQuery,
      });
      throw error;
    }

    const data = (await res.json()) as GoogleBooksResponse;
    let editions = refineSearchResults(
      onlyWithCover(
        (data.items ?? [])
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
}

export async function fetchGoogleBookMetadata(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
}): Promise<BookMetadataResult | null> {
  let volumes = await searchEditionsForBook(input.title, input.author);

  if (input.googleBooksId) {
    const byId = await fetchGoogleVolumeById(input.googleBooksId);
    if (byId) {
      const inList = volumes.some((v) => v.id === byId.id);
      if (!inList) volumes = [byId, ...volumes];
    }
  }

  const best = pickBestVolume(volumes);
  if (!best) return null;

  const patch = volumeToBookPatch(best);
  const apiCategories = ensureBookCategories(patch.categories ?? []);
  const description = await resolveBookDescription(
    volumes,
    input.title,
    input.author,
    input.googleBooksId ?? best.id,
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
  };
}
