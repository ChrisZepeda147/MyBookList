"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen, Loader2, Search } from "lucide-react";
import type { BookSearchResult } from "@/lib/types";
import {
  BOOK_SEARCH_API_TIMEOUT_MS,
  fetchWithTimeout,
  isAbortError,
  isFetchTimeoutError,
} from "@/lib/fetch-with-timeout";
import { onlyWithCover } from "@/lib/google-books-client";
import {
  isGoogleBooksCircuitOpen,
  tripGoogleBooksCircuit,
} from "@/lib/google-books-circuit";
import { formatUnknownError } from "@/lib/supabase-errors";
import {
  bookHasDisplayableCover,
  resolveCoverUrl,
} from "@/lib/cover-url";
import { CategoryBadges } from "@/components/CategoryBadges";

interface BookSearchProps {
  onManualEntry: () => void;
  onSelect: (book: BookSearchResult) => void;
}

const BOOKS_API_UNAVAILABLE =
  "Search temporarily unavailable. Please try again in a moment.";

function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

const SEARCH_TIMEOUT_MESSAGE =
  "Search timed out. Please try again in a moment.";

function isRateOrAccessError(status: number): boolean {
  return status === 429 || status === 403;
}

function booksApiErrorMessage(status: number): string {
  if (isRateOrAccessError(status) || status >= 500) {
    return BOOKS_API_UNAVAILABLE;
  }
  return `Book search failed (${status}). Please try again.`;
}

function logBooksApiError(context: string, error: unknown, extra?: unknown) {
  console.error("Books API Error:", context, formatUnknownError(error), extra);
}

async function fetchGoogleBooks(
  query: string,
  signal: AbortSignal,
  requestId: number,
): Promise<BookSearchResult[]> {
  const url = `/api/books/search?q=${encodeURIComponent(query)}&r=${encodeURIComponent(String(requestId))}`;

  try {
    const response = await fetchWithTimeout(url, {
      signal,
      timeoutMs: BOOK_SEARCH_API_TIMEOUT_MS,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        tripGoogleBooksCircuit();
      }
      const message = booksApiErrorMessage(response.status);
      const error = new Error(message);
      logBooksApiError("Google Books proxy", error, {
        status: response.status,
        query,
      });
      throw error;
    }

    const data: unknown = await response.json();

    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "error" in data
    ) {
      tripGoogleBooksCircuit();
      const error = new Error(BOOKS_API_UNAVAILABLE);
      logBooksApiError("Google Books proxy payload", error, data);
      throw error;
    }

    return filterSearchResults(data as BookSearchResult[]);
  } catch (err) {
    if (isAbortError(err) || isFetchTimeoutError(err)) throw err;
    if (err instanceof Error && err.message === BOOKS_API_UNAVAILABLE) throw err;
    if (err instanceof Error && err.message.startsWith("Book search failed")) {
      throw err;
    }

    const error = new Error(BOOKS_API_UNAVAILABLE);
    logBooksApiError("Google Books proxy network", error, err);
    throw error;
  }
}

function filterSearchResults(books: BookSearchResult[]): BookSearchResult[] {
  return onlyWithCover(books);
}

async function fetchOpenLibraryBooks(
  query: string,
  signal: AbortSignal,
  requestId: number,
): Promise<BookSearchResult[]> {
  const url = `/api/books/open-library?q=${encodeURIComponent(query)}&r=${encodeURIComponent(String(requestId))}`;

  try {
    const response = await fetchWithTimeout(url, {
      signal,
      timeoutMs: BOOK_SEARCH_API_TIMEOUT_MS,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      const message = booksApiErrorMessage(response.status);
      const error = new Error(message);
      logBooksApiError("Open Library", error, {
        status: response.status,
        query,
      });
      throw error;
    }

    const data: unknown = await response.json();

    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "error" in data
    ) {
      const error = new Error(BOOKS_API_UNAVAILABLE);
      logBooksApiError("Open Library proxy payload", error, data);
      throw error;
    }

    return filterSearchResults(data as BookSearchResult[]);
  } catch (err) {
    if (isAbortError(err) || isFetchTimeoutError(err)) throw err;
    if (err instanceof Error && err.message === BOOKS_API_UNAVAILABLE) throw err;
    if (err instanceof Error && err.message.startsWith("Book search failed")) {
      throw err;
    }

    const error = new Error(BOOKS_API_UNAVAILABLE);
    logBooksApiError("Open Library network", error, err);
    throw error;
  }
}

async function searchLiveBooks(
  query: string,
  signal: AbortSignal,
  requestId: number,
): Promise<{ results: BookSearchResult[]; source: "google" | "openlibrary" }> {
  if (signal.aborted) {
    throw new DOMException("Search aborted", "AbortError");
  }

  if (!isGoogleBooksCircuitOpen()) {
    try {
      const googleResults = await fetchGoogleBooks(query, signal, requestId);
      if (signal.aborted) {
        throw new DOMException("Search aborted", "AbortError");
      }
      if (googleResults.length > 0) {
        return { results: filterSearchResults(googleResults), source: "google" };
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      logBooksApiError("Google Books fallback", err, { query });
      // Fall through to Open Library (rate limits, timeouts, network errors).
    }
  }

  if (signal.aborted) {
    throw new DOMException("Search aborted", "AbortError");
  }

  const openLibraryResults = await fetchOpenLibraryBooks(
    query,
    signal,
    requestId,
  );
  return {
    results: filterSearchResults(openLibraryResults),
    source: "openlibrary",
  };
}

export function BookSearch({ onManualEntry, onSelect }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [source, setSource] = useState<"google" | "openlibrary" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchGenerationRef = useRef(0);

  const search = useCallback(async (rawQuery: string) => {
    const normalizedQuery = normalizeSearchQuery(rawQuery);

    abortRef.current?.abort();

    if (!normalizedQuery) {
      searchGenerationRef.current += 1;
      setResults([]);
      setSource(null);
      setError(null);
      setLoading(false);
      return;
    }

    const generation = ++searchGenerationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const { results: books, source: src } = await searchLiveBooks(
        normalizedQuery,
        controller.signal,
        generation,
      );

      if (generation !== searchGenerationRef.current) return;

      setResults(filterSearchResults(books));
      setSource(src);
    } catch (err) {
      if (generation !== searchGenerationRef.current) return;
      if (isAbortError(err)) return;

      if (isFetchTimeoutError(err)) {
        setResults([]);
        setSource(null);
        setError(SEARCH_TIMEOUT_MESSAGE);
        return;
      }

      logBooksApiError("Book search", err, { query: normalizedQuery });

      setResults([]);
      setSource(null);
      setError(
        err instanceof Error ? err.message : BOOKS_API_UNAVAILABLE,
      );
    } finally {
      if (generation === searchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const runSearch = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      setFailedCoverIds(new Set());
      setOpen(true);
      setHasSearched(true);
      void search(value);
    },
    [search],
  );

  const resetSearchState = useCallback(() => {
    abortRef.current?.abort();
    searchGenerationRef.current += 1;
    setResults([]);
    setSource(null);
    setLoading(false);
    setError(null);
    setHasSearched(false);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleBookSelect(book: BookSearchResult) {
    if (!bookHasDisplayableCover(book)) return;
    setOpen(false);
    onSelect(book);
  }

  function markCoverFailed(bookId: string) {
    setFailedCoverIds((prev) => {
      if (prev.has(bookId)) return prev;
      const next = new Set(prev);
      next.add(bookId);
      return next;
    });
  }

  const visibleResults = results.filter(
    (book) =>
      bookHasDisplayableCover(book) && !failedCoverIds.has(book.id),
  );

  const showPanel = open && query.trim().length > 0;
  const awaitingExplicitSearch =
    query.trim().length > 0 &&
    !hasSearched &&
    !loading &&
    !error &&
    results.length === 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${showPanel ? "z-50" : "z-0"}`}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              setOpen(true);

              if (!value.trim()) {
                resetSearchState();
                return;
              }

              setError(null);
              setHasSearched(false);
              setResults([]);
              setSource(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              runSearch(query);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Type here — let's find your book!"
            className="add-book-search-input w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            aria-label="Search books"
            aria-expanded={showPanel}
            aria-haspopup="listbox"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-500" />
          )}
        </div>
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={!query.trim() || loading}
          className="add-book-search-btn shrink-0 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          Search
        </button>
      </div>

      {showPanel && (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl"
          role="listbox"
        >
          {error ? (
            <div className="flex items-start gap-3 px-4 py-4 text-left">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={onManualEntry}
                  className="mt-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Add manually instead
                </button>
              </div>
            </div>
          ) : awaitingExplicitSearch ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Press{" "}
              <span className="font-medium text-blue-600">Search</span> or hit{" "}
              <span className="font-medium text-blue-600">Enter</span> to look up
              your book.
            </div>
          ) : loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Searching live book catalogs…
            </div>
          ) : visibleResults.length > 0 ? (
            <>
              <p className="border-b border-slate-50 px-4 py-2 text-xs text-slate-400">
                {source === "google" ? "Google Books" : "Open Library"} — pick
                the edition with the right page count
              </p>
              <ul className="max-h-96 overflow-y-auto">
                {visibleResults.map((book) => {
                  const coverSrc = resolveCoverUrl(book.coverUrl, "list");
                  if (!coverSrc) return null;

                  return (
                  <li key={book.id} role="option">
                    <button
                      type="button"
                      onClick={() => handleBookSelect(book)}
                      className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverSrc}
                        alt=""
                        onError={() => markCoverFailed(book.id)}
                        className="mt-0.5 h-16 w-11 shrink-0 rounded object-cover shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {book.title}
                          </p>
                          {book.pageCount != null && book.pageCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              <BookOpen className="h-3 w-3" />
                              {book.pageCount} pages
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{book.author}</p>
                        {(book.categories.length > 0 ||
                          (book.apiCategories?.length ?? 0) > 0) && (
                          <div className="mt-1.5">
                            <CategoryBadges
                              categories={book.categories}
                              apiCategories={book.apiCategories}
                              description={book.description}
                              title={book.title}
                              subtitle={book.subtitle}
                              author={book.author}
                              compact
                            />
                          </div>
                        )}
                        {book.editionLabel && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {book.editionLabel}
                          </p>
                        )}
                        {book.description && (
                          <p className="book-description-clamp mt-1 text-xs text-slate-400">
                            {book.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">
                No books found for &ldquo;{query}&rdquo;
              </p>
              <button
                type="button"
                onClick={onManualEntry}
                className="mt-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Add manually instead
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
