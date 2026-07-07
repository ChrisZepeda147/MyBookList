"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import type { BookSearchResult } from "@/lib/types";
import {
  RECOMMENDATIONS_API_TIMEOUT_MS,
  fetchWithTimeout,
  isFetchTimeoutError,
} from "@/lib/fetch-with-timeout";
import {
  BOOKS_API_UNAVAILABLE,
  filterIgnoredRecommendations,
  MIN_RECOMMENDATIONS,
  ratedBooksFingerprintForCache,
  readRecommendationCache,
  writeRecommendationCache,
} from "@/lib/recommendations";
import type { RecommendationResult } from "@/lib/recommendations";
import { normalizeTitle, onlyWithCover } from "@/lib/google-books-client";
import {
  bookHasDisplayableCover,
  filterBooksWithDisplayableCovers,
  resolveCoverUrl,
} from "@/lib/cover-url";
import {
  addIgnoredRecommendationId,
  readIgnoredRecommendationIds,
} from "@/lib/ignored-recommendations";
import { CategoryBadges } from "@/components/CategoryBadges";
import { useBookStore } from "@/providers/BookStoreProvider";

interface RecommendedBooksProps {
  onSelect: (book: BookSearchResult) => void;
}

function dedupeDisplayBooks(books: BookSearchResult[]): BookSearchResult[] {
  const seen = new Set<string>();
  const out: BookSearchResult[] = [];
  for (const book of filterBooksWithDisplayableCovers(books, "list")) {
    const key = normalizeTitle(book.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(book);
  }
  return out;
}

export function RecommendedBooks({ onSelect }: RecommendedBooksProps) {
  const { books, loaded } = useBookStore();
  const [recommendations, setRecommendations] = useState<BookSearchResult[]>([]);
  const [candidatePool, setCandidatePool] = useState<BookSearchResult[]>([]);
  const [heading, setHeading] = useState("Critically Acclaimed Classics");
  const [subtitle, setSubtitle] = useState("A fresh mix of beloved classics");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(
    () => new Set(readIgnoredRecommendationIds()),
  );
  const [fetchingReplacement, setFetchingReplacement] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    recommendations,
    candidatePool,
    ignoredIds,
    failedCoverIds,
  });
  stateRef.current = {
    recommendations,
    candidatePool,
    ignoredIds,
    failedCoverIds,
  };
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  const scrollRecommendations = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (direction < 0 && el.scrollLeft <= 4) return;
    if (direction > 0 && el.scrollLeft >= maxScroll - 4) return;

    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }, []);

  const ratedFingerprint = useMemo(
    () => ratedBooksFingerprintForCache(books),
    [books],
  );

  const booksFingerprint = useMemo(
    () =>
      books
        .map((b) => `${b.id}:${b.rating}:${b.title}`)
        .sort()
        .join("|"),
    [books],
  );

  const applyRecommendationResult = useCallback((result: RecommendationResult) => {
    const ignored = new Set(readIgnoredRecommendationIds());
    setIgnoredIds(ignored);

    const filtered = filterIgnoredRecommendations(
      dedupeDisplayBooks(onlyWithCover(result.books)),
      ignored,
    );
    setRecommendations(filtered);
    setCandidatePool([]);
    setFailedCoverIds(new Set());
    setHeading(result.heading);
    setSubtitle(result.subtitle);
  }, []);

  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function loadRecommendations() {
      setLoading(true);
      setError(null);

      const cached = readRecommendationCache(ratedFingerprint, books);
      if (cached) {
        if (!cancelled) {
          applyRecommendationResult(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetchWithTimeout("/api/books/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ books }),
          timeoutMs: RECOMMENDATIONS_API_TIMEOUT_MS,
        });

        if (cancelled) return;

        if (response.status === 429) {
          setRecommendations([]);
          setCandidatePool([]);
          setHeading("Recommendations paused");
          setSubtitle("");
          setError(BOOKS_API_UNAVAILABLE);
          return;
        }

        if (!response.ok) {
          throw new Error(`Recommendations API ${response.status}`);
        }

        const result = (await response.json()) as RecommendationResult;
        applyRecommendationResult(result);

        const display = filterIgnoredRecommendations(
          dedupeDisplayBooks(onlyWithCover(result.books)),
          readIgnoredRecommendationIds(),
        );
        if (display.length > 0) {
          writeRecommendationCache(result, ratedFingerprint);
        }
      } catch (err) {
        console.error("[RecommendedBooks] Fetch failed:", err);
        if (cancelled) return;

        setRecommendations([]);
        setCandidatePool([]);
        setHeading("Recommendations paused");
        setSubtitle("");
        setError(
          isFetchTimeoutError(err)
            ? "Recommendations are taking longer than expected. Please try again."
            : BOOKS_API_UNAVAILABLE,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [loaded, booksFingerprint, ratedFingerprint, books, applyRecommendationResult, reloadNonce]);

  const displayBooks = useMemo(
    () =>
      dedupeDisplayBooks(onlyWithCover(recommendations)).filter(
        (book) =>
          bookHasDisplayableCover(book) &&
          !failedCoverIds.has(book.id) &&
          !ignoredIds.has(book.id),
      ),
    [recommendations, failedCoverIds, ignoredIds],
  );

  const visibleRecommendationCount = useCallback((): number => {
    const { recommendations: recs, ignoredIds: ignored, failedCoverIds: failed } =
      stateRef.current;
    return dedupeDisplayBooks(onlyWithCover(recs)).filter(
      (book) =>
        bookHasDisplayableCover(book) &&
        !failed.has(book.id) &&
        !ignored.has(book.id),
    ).length;
  }, []);

  const pullReplacementFromPool = useCallback(
    (exclude: Set<string>, activeIgnored: Set<string>): BookSearchResult | null => {
      const { candidatePool: pool, failedCoverIds: failed } = stateRef.current;
      for (const candidate of pool) {
        if (
          activeIgnored.has(candidate.id) ||
          exclude.has(candidate.id) ||
          failed.has(candidate.id) ||
          !bookHasDisplayableCover(candidate)
        ) {
          continue;
        }

        setCandidatePool((prev) => {
          const nextPool = prev.filter((entry) => entry.id !== candidate.id);
          stateRef.current = { ...stateRef.current, candidatePool: nextPool };
          return nextPool;
        });
        setRecommendations((prev) => {
          if (prev.some((book) => book.id === candidate.id)) return prev;
          const next = [...prev, candidate];
          stateRef.current = { ...stateRef.current, recommendations: next };
          return next;
        });
        return candidate;
      }

      return null;
    },
    [],
  );

  const fetchOneReplacement = useCallback(
    async (activeIgnored: Set<string>): Promise<boolean> => {
      const { recommendations: recs } = stateRef.current;
      const exclude = new Set([
        ...recs.map((book) => book.id),
        ...activeIgnored,
      ]);

      if (pullReplacementFromPool(exclude, activeIgnored)) {
        return true;
      }

      try {
        const response = await fetchWithTimeout(
          "/api/books/recommendations/next",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              books,
              ignoredIds: Array.from(activeIgnored),
              excludeIds: Array.from(exclude),
            }),
            timeoutMs: RECOMMENDATIONS_API_TIMEOUT_MS,
          },
        );

        if (!response.ok) return false;

        const payload = (await response.json()) as { book?: BookSearchResult | null };
        const next = payload.book;
        if (!next || !bookHasDisplayableCover(next)) return false;

        setRecommendations((prev) => {
          if (
            prev.some((book) => book.id === next.id) ||
            activeIgnored.has(next.id)
          ) {
            return prev;
          }
          const updated = [...prev, next];
          stateRef.current = { ...stateRef.current, recommendations: updated };
          return updated;
        });
        return true;
      } catch (err) {
        console.error("[RecommendedBooks] Replacement fetch failed:", err);
        return false;
      }
    },
    [books, pullReplacementFromPool],
  );

  const replenishToMinimum = useCallback(
    async (ignoredOverride?: Set<string>) => {
      if (loading || error) return;

      const activeIgnored = ignoredOverride ?? stateRef.current.ignoredIds;
      setFetchingReplacement(true);

      try {
        for (let attempt = 0; attempt < 12; attempt++) {
          if (visibleRecommendationCount() >= MIN_RECOMMENDATIONS) break;

          const added = await fetchOneReplacement(activeIgnored);
          if (!added) break;
        }
      } finally {
        setFetchingReplacement(false);
      }
    },
    [error, fetchOneReplacement, loading, visibleRecommendationCount],
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayBooks, loading, error, updateScrollState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
    updateScrollState();
  }, [displayBooks, updateScrollState]);

  useEffect(() => {
    if (loading || error || fetchingReplacement) return;
    if (displayBooks.length >= MIN_RECOMMENDATIONS) return;
    void replenishToMinimum();
  }, [
    displayBooks.length,
    error,
    fetchingReplacement,
    loading,
    replenishToMinimum,
  ]);

  const replaceDismissedBook = useCallback(
    async (_dismissedId: string, ignoredOverride?: Set<string>) => {
      await replenishToMinimum(ignoredOverride ?? ignoredIds);
    },
    [ignoredIds, replenishToMinimum],
  );

  function markCoverFailed(bookId: string) {
    setFailedCoverIds((prev) => {
      if (prev.has(bookId)) return prev;
      const next = new Set(prev);
      next.add(bookId);
      return next;
    });

    const nextIgnored = addIgnoredRecommendationId(bookId);
    const ignoredSet = new Set(nextIgnored);
    setIgnoredIds(ignoredSet);
    setRecommendations((prev) => prev.filter((entry) => entry.id !== bookId));
    void replaceDismissedBook(bookId, ignoredSet);
  }

  function dismissBook(book: BookSearchResult) {
    const nextIgnored = addIgnoredRecommendationId(book.id);
    const ignoredSet = new Set(nextIgnored);
    setIgnoredIds(ignoredSet);
    setRecommendations((prev) => prev.filter((entry) => entry.id !== book.id));
    void replaceDismissedBook(book.id, ignoredSet);
  }

  return (
    <section className="relative z-0 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{heading}</h2>
          {subtitle && !loading && !error && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Loading recommendations…
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setReloadNonce((n) => n + 1);
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Try again
            </button>
          </div>
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
          No recommendations available right now.
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => scrollRecommendations(-1)}
            aria-disabled={!canScrollLeft}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`flex h-auto shrink-0 items-center justify-center self-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors focus:outline-none ${
              canScrollLeft
                ? "hover:bg-slate-50 hover:text-slate-900"
                : "pointer-events-none opacity-35"
            }`}
            aria-label="Previous recommendations"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {displayBooks.map((book) => {
              const coverSrc = resolveCoverUrl(book.coverUrl, "list");
              if (!coverSrc) return null;

              return (
                <div
                  key={book.id || normalizeTitle(book.title)}
                  className="group relative w-[calc((100%-3rem)/5)] min-w-[6.5rem] max-w-[8.75rem] shrink-0 sm:w-[calc((100%-3.75rem)/6)] md:w-[calc((100%-4.5rem)/7)] lg:w-[calc((100%-5.25rem)/8)]"
                >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBook(book);
                  }}
                  className="absolute right-1 top-1 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/55 text-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  aria-label={`Dismiss ${book.title}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!bookHasDisplayableCover(book)) return;
                    onSelect(book);
                  }}
                  className="w-full text-left transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-100 shadow-sm ring-1 ring-slate-100 transition-shadow group-hover:shadow-md group-hover:ring-blue-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverSrc}
                      alt=""
                      onError={() => markCoverFailed(book.id)}
                      className="h-full w-full object-cover"
                    />
                    {book.pageCount != null && book.pageCount > 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {book.pageCount}p
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-700 transition-colors group-hover:text-blue-600">
                    {book.title}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-slate-400">
                    {book.author}
                  </p>
                  {(book.categories.length > 0 ||
                    (book.apiCategories?.length ?? 0) > 0 ||
                    book.description ||
                    book.title) && (
                    <div className="mt-1">
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
                </button>
              </div>
            );
          })}

          {fetchingReplacement && (
            <div className="flex aspect-[2/3] w-[calc((100%-3rem)/5)] min-w-[6.5rem] max-w-[8.75rem] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 sm:w-[calc((100%-3.75rem)/6)] md:w-[calc((100%-4.5rem)/7)] lg:w-[calc((100%-5.25rem)/8)]">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          )}
          </div>

          <button
            type="button"
            onClick={() => scrollRecommendations(1)}
            aria-disabled={!canScrollRight}
            tabIndex={canScrollRight ? 0 : -1}
            className={`flex h-auto shrink-0 items-center justify-center self-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors focus:outline-none ${
              canScrollRight
                ? "hover:bg-slate-50 hover:text-slate-900"
                : "pointer-events-none opacity-35"
            }`}
            aria-label="Next recommendations"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}
