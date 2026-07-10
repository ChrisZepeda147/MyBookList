import type { BookSearchResult } from "@/lib/types";
import { resolveBookCategoryTags } from "@/lib/categories";
import { sanitizePageCount } from "@/lib/page-count";
import {
  BOOK_SEARCH_TIMEOUT_MS,
  fetchWithTimeout,
} from "@/lib/fetch-with-timeout";
import { normalizeCoverUrl } from "@/lib/cover-url";
import { onlyWithCover } from "@/lib/google-books-client";
import { resolveOpenLibraryDocDescription } from "@/lib/open-library";

const OPEN_LIBRARY_API = "https://openlibrary.org/search.json";

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_sentence?: string[] | string;
  description?: unknown;
  number_of_pages_median?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

async function mapInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function mapOpenLibraryDoc(
  doc: OpenLibraryDoc,
): Promise<BookSearchResult | null> {
  if (!doc.cover_i) return null;

  const id = doc.key?.replace(/^\//, "") ?? crypto.randomUUID();
  const pageCount = sanitizePageCount(doc.number_of_pages_median);
  const title = doc.title ?? "Unknown Title";
  const author = doc.author_name?.join(", ") ?? "Unknown Author";
  const description = await resolveOpenLibraryDocDescription(doc);
  const coverUrl = normalizeCoverUrl(
    `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
  );
  if (!coverUrl) return null;

  return {
    id: `ol-${id}`,
    title,
    author,
    coverUrl,
    description,
    pageCount,
    apiCategories: [],
    categories: resolveBookCategoryTags(
      [],
      [],
      description,
      title,
      author,
    ),
    editionLabel:
      pageCount != null ? `${pageCount} pages` : "Open Library",
  };
}

/** Server-side Open Library catalog search (used by /api/books/open-library). */
export async function searchOpenLibraryBooks(
  query: string,
): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: "25",
    fields:
      "key,title,author_name,cover_i,first_sentence,description,number_of_pages_median",
  });

  const response = await fetchWithTimeout(
    `${OPEN_LIBRARY_API}?${params.toString()}`,
    {
      timeoutMs: BOOK_SEARCH_TIMEOUT_MS,
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenLibraryResponse;
  const mapped = await mapInParallel(data.docs ?? [], 3, mapOpenLibraryDoc);

  return onlyWithCover(
    mapped.filter((book): book is BookSearchResult => book !== null),
  );
}
