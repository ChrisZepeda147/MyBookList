import type { BookSearchResult } from "@/lib/types";
import { ensureBookDescription } from "@/lib/book-descriptions";
import { resolveBookCategoryTags } from "@/lib/categories";
import { sanitizePageCount } from "@/lib/page-count";
import {
  BOOK_SEARCH_TIMEOUT_MS,
  fetchWithTimeout,
} from "@/lib/fetch-with-timeout";
import { normalizeCoverUrl } from "@/lib/cover-url";
import { onlyWithCover } from "@/lib/google-books-client";

const OPEN_LIBRARY_API = "https://openlibrary.org/search.json";

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_sentence?: string[];
  number_of_pages_median?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

function mapOpenLibraryDoc(doc: OpenLibraryDoc): BookSearchResult | null {
  if (!doc.cover_i) return null;

  const id = doc.key?.replace(/^\//, "") ?? crypto.randomUUID();
  const pageCount = sanitizePageCount(doc.number_of_pages_median);
  const title = doc.title ?? "Unknown Title";
  const author = doc.author_name?.join(", ") ?? "Unknown Author";
  const description = ensureBookDescription(doc.first_sentence?.join(" "));
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
    q: `language:eng ${trimmed}`,
    limit: "25",
    fields:
      "key,title,author_name,cover_i,first_sentence,number_of_pages_median",
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
  return onlyWithCover(
    (data.docs ?? [])
      .map(mapOpenLibraryDoc)
      .filter((book): book is BookSearchResult => book !== null),
  );
}
