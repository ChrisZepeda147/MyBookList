"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import type { BookSearchResult } from "@/lib/types";
import {
  MIN_RECOMMENDATIONS,
  filterIgnoredRecommendations,
  patchCurrentRecommendationsCache,
  type RecommendationResult,
} from "@/lib/recommendations";
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
import {
  RECOMMENDATIONS_CACHE_UPDATED_EVENT,
  fetchReplacementRecommendation,
  readCachedRecommendations,
} from "@/lib/recommendation-cache-client";
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
  const [heading, setHeading] = useState("Recommended for You");
  const [subtitle, setSubtitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(
    () => new Set(readIgnoredRecommendationIds()),
  );
  const [fetchingReplacement, setFetchingReplacement] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    recommendations,
    ignoredIds,
    failedCoverIds,
  });
  stateRef.current = {
    recommendations,
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

  const applyRecommendationResult = useCallback((result: RecommendationResult) => {
    const ignored = new Set(readIgnoredRecommendationIds());
    setIgnoredIds(ignored);

    const filtered = filterIgnoredRecommendations(
      dedupeDisplayBooks(onlyWithCover(result.books)),
      ignored,
    );
    setRecommendations(filtered);
    setFailedCoverIds(new Set());
    setHeading(result.heading);
    setSubtitle(result.subtitle);
  }, []);

  const loadFromCache = useCallback(() => {
    const cached = readCachedRecommendations(books);
    if (cached) {
      applyRecommendationResult(cached);
      return true;
    }
    setRecommendations([]);
    setHeading("Recommended for You");
    setSubtitle("Rate a completed book 4+ stars to generate picks");
    return false;
  }, [applyRecommendationResult, books]);

  useEffect(() => {
    if (!loaded) {
      setLoading(true);
      return;
    }

    loadFromCache();
    setLoading(false);
  }, [loaded, loadFromCache]);

  useEffect(() => {
    if (!loaded) return;

    function onCacheUpdated(event: Event) {
      const detail = (event as CustomEvent<RecommendationResult>).detail;
      if (detail?.books?.length) {
        applyRecommendationResult(detail);
        return;
      }
      loadFromCache();
    }

    window.addEventListener(RECOMMENDATIONS_CACHE_UPDATED_EVENT, onCacheUpdated);
    return () => {
      window.removeEventListener(
        RECOMMENDATIONS_CACHE_UPDATED_EVENT,
        onCacheUpdated,
      );
    };
  }, [applyRecommendationResult, loadFromCache, loaded]);

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

  const fetchOneReplacement = useCallback(
    async (
      activeIgnored: Set<string>,
      currentRecommendations: BookSearchResult[],
    ): Promise<BookSearchResult | null> => {
      const exclude = new Set([
        ...currentRecommendations.map((book) => book.id),
        ...activeIgnored,
      ]);

      const next = await fetchReplacementRecommendation(books, {
        ignoredIds: Array.from(activeIgnored),
        excludeIds: Array.from(exclude),
      });

      if (!next || !bookHasDisplayableCover(next)) return null;
      if (
        activeIgnored.has(next.id) ||
        exclude.has(next.id) ||
        currentRecommendations.some((book) => book.id === next.id)
      ) {
        return null;
      }

      return next;
    },
    [books],
  );

  const replaceDismissedBook = useCallback(
    async (dismissedId: string, ignoredOverride: Set<string>) => {
      setFetchingReplacement(true);

      try {
        const remaining = stateRef.current.recommendations.filter(
          (entry) =>
            entry.id !== dismissedId &&
            !ignoredOverride.has(entry.id) &&
            !stateRef.current.failedCoverIds.has(entry.id),
        );

        const replacement = await fetchOneReplacement(ignoredOverride, remaining);
        const nextList = replacement ? [...remaining, replacement] : remaining;

        setRecommendations(nextList);
        patchCurrentRecommendationsCache(nextList, books);
      } finally {
        setFetchingReplacement(false);
      }
    },
    [books, fetchOneReplacement],
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

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayBooks, loading, updateScrollState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
    updateScrollState();
  }, [displayBooks, updateScrollState]);

  return (
    <section className="relative z-0 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{heading}</h2>
          {subtitle && !loading && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Loading recommendations…
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
          Rate a completed book 4+ stars to generate your first five picks.
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
            {displayBooks.slice(0, MIN_RECOMMENDATIONS).map((book) => {
              const coverSrc = resolveCoverUrl(book.coverUrl, "list");
              if (!coverSrc) return null;

              return (
                <div
                  key={book.id || normalizeTitle(book.title)}
                  className="group relative w-[calc((100%-3rem)/5)] min-w-[6.5rem] max-w-[8.75rem] shrink-0"
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
              <div className="flex aspect-[2/3] w-[calc((100%-3rem)/5)] min-w-[6.5rem] max-w-[8.75rem] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
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
