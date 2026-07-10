import type { BookEntry, BookSearchResult } from "@/lib/types";
import {
  RECOMMENDATIONS_API_TIMEOUT_MS,
  fetchWithTimeout,
} from "@/lib/fetch-with-timeout";
import {
  HIGH_RATING_THRESHOLD,
  type RecommendationResult,
  readCurrentRecommendationsCache,
  writeCurrentRecommendationsCache,
} from "@/lib/recommendations";

export const RECOMMENDATIONS_CACHE_UPDATED_EVENT = "recommendations-cache-updated";

let refreshInFlight: Promise<RecommendationResult | null> | null = null;

export function shouldRefreshRecommendationsOnRating(
  rating: number | null,
): boolean {
  return rating != null && rating >= HIGH_RATING_THRESHOLD;
}

export async function refreshRecommendationsFromTopRated(
  books: BookEntry[],
): Promise<RecommendationResult | null> {
  try {
    const response = await fetchWithTimeout("/api/books/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ books, mode: "top-rated" }),
      timeoutMs: RECOMMENDATIONS_API_TIMEOUT_MS,
    });

    if (!response.ok) {
      console.error(
        "[recommendations] Refresh failed:",
        response.status,
      );
      return null;
    }

    const result = (await response.json()) as RecommendationResult;
    if (result.books.length > 0) {
      writeCurrentRecommendationsCache(result, books);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(RECOMMENDATIONS_CACHE_UPDATED_EVENT, {
            detail: result,
          }),
        );
      }
    }
    return result;
  } catch (err) {
    console.error("[recommendations] Refresh failed:", err);
    return null;
  }
}

export function scheduleRecommendationsRefresh(books: BookEntry[]): void {
  if (refreshInFlight) return;

  refreshInFlight = refreshRecommendationsFromTopRated(books).finally(() => {
    refreshInFlight = null;
  });
}

export async function fetchReplacementRecommendation(
  books: BookEntry[],
  options: {
    ignoredIds: string[];
    excludeIds: string[];
  },
): Promise<BookSearchResult | null> {
  try {
    const response = await fetchWithTimeout("/api/books/recommendations/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        books,
        ignoredIds: options.ignoredIds,
        excludeIds: options.excludeIds,
      }),
      timeoutMs: RECOMMENDATIONS_API_TIMEOUT_MS,
    });

    if (!response.ok) {
      console.error(
        "[recommendations] Replacement fetch failed:",
        response.status,
      );
      return null;
    }

    const payload = (await response.json()) as { book?: BookSearchResult | null };
    return payload.book ?? null;
  } catch (err) {
    console.error("[recommendations] Replacement fetch failed:", err);
    return null;
  }
}

export function readCachedRecommendations(
  books: BookEntry[],
): RecommendationResult | null {
  return readCurrentRecommendationsCache(books);
}
