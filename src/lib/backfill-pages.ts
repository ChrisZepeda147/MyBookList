import type { BookEntry } from "@/lib/types";
import type { BookMetadataResult } from "@/lib/google-books";
import {
  hasRealDescription,
  ensureBookDescription,
} from "@/lib/book-descriptions";
import {
  categoriesFromApi,
  resolveBookCategoryTags,
} from "@/lib/categories";
import { isPlausiblePageCount } from "@/lib/page-count";
import { isGoogleBooksCircuitOpen } from "@/lib/google-books-circuit";

const BACKFILL_DELAY_MS = 800;
const BACKFILL_DEBOUNCE_MS = 60_000;
const BACKFILL_RETRY_MS = 24 * 60 * 60 * 1000;
const BACKFILL_MAX_BOOKS_PER_RUN = 4;
const BACKFILL_SESSION_STORAGE_KEY = "book_metadata_backfill_v1";
const BACKFILL_ATTEMPTS_STORAGE_KEY = "book_metadata_backfill_attempts_v1";

type BackfillSessionState = {
  fingerprint: string;
  attemptedAt: number;
  bookIds: string[];
};

type BackfillAttempts = Record<string, number>;

let backfillDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let backfillInFlight = false;

/** True when description or page count still needs an API lookup. */
export function bookNeedsMetadataBackfill(book: BookEntry): boolean {
  if (!hasRealDescription(book.description)) return true;

  const pages = book.pageCount ?? 0;
  if (
    !book.pageCountLocked &&
    (pages <= 0 || !isPlausiblePageCount(pages))
  ) {
    return true;
  }

  return false;
}

export function filterBooksNeedingMetadataBackfill(
  books: BookEntry[],
): BookEntry[] {
  return books.filter(bookNeedsMetadataBackfill);
}

function backfillFingerprint(books: BookEntry[]): string {
  return filterBooksNeedingMetadataBackfill(books)
    .map((book) => book.id)
    .sort()
    .join("|");
}

function readBackfillSession(): BackfillSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BACKFILL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackfillSessionState;
  } catch {
    return null;
  }
}

function writeBackfillSession(state: BackfillSessionState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BACKFILL_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors.
  }
}

function readBackfillAttempts(): BackfillAttempts {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BACKFILL_ATTEMPTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BackfillAttempts;
  } catch {
    return {};
  }
}

function writeBackfillAttempts(attempts: BackfillAttempts): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      BACKFILL_ATTEMPTS_STORAGE_KEY,
      JSON.stringify(attempts),
    );
  } catch {
    // Ignore quota errors.
  }
}

function recordBackfillAttempt(bookId: string): void {
  const attempts = readBackfillAttempts();
  attempts[bookId] = Date.now();
  writeBackfillAttempts(attempts);
}

function wasBookRecentlyBackfilled(bookId: string): boolean {
  const attemptedAt = readBackfillAttempts()[bookId];
  return attemptedAt != null && Date.now() - attemptedAt < BACKFILL_RETRY_MS;
}

function booksEligibleForBackfill(books: BookEntry[]): BookEntry[] {
  return filterBooksNeedingMetadataBackfill(books).filter(
    (book) => !wasBookRecentlyBackfilled(book.id),
  );
}

function shouldSkipLibraryBackfill(books: BookEntry[]): boolean {
  const eligible = booksEligibleForBackfill(books);
  if (eligible.length === 0) return true;
  if (isGoogleBooksCircuitOpen()) return true;

  const fingerprint = backfillFingerprint(books);
  const session = readBackfillSession();
  if (!session) return false;

  const recentlyAttempted =
    session.fingerprint === fingerprint &&
    Date.now() - session.attemptedAt < BACKFILL_DEBOUNCE_MS;

  if (!recentlyAttempted) return false;

  const attempted = new Set(session.bookIds);
  return eligible.every((book) => attempted.has(book.id));
}

function shouldUseLiteBackfill(book: BookEntry): boolean {
  const needsDescription = !hasRealDescription(book.description);
  const pages = book.pageCount ?? 0;
  const needsPages =
    !book.pageCountLocked &&
    (pages <= 0 || !isPlausiblePageCount(pages));

  if (needsDescription && !needsPages) return false;
  return true;
}

async function fetchMetadataFromApi(
  book: BookEntry,
  options?: { lite?: boolean },
): Promise<BookMetadataResult | null> {
  if (isGoogleBooksCircuitOpen()) return null;

  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
  });
  if (book.googleBooksId) {
    params.set("id", book.googleBooksId);
  }
  if (options?.lite) {
    params.set("lite", "1");
  }

  const response = await fetch(`/api/books/metadata?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;
  return (await response.json()) as BookMetadataResult;
}

function applyMetadata(
  book: BookEntry,
  meta: BookMetadataResult,
): Partial<BookEntry> {
  const description = hasRealDescription(book.description)
    ? book.description!
    : ensureBookDescription(meta.description ?? book.description);
  const apiCategories =
    meta.apiCategories?.length ? meta.apiCategories : (book.apiCategories ?? []);
  const categories = apiCategories.length
    ? categoriesFromApi(
        apiCategories,
        description,
        book.title,
        book.author,
      )
    : resolveBookCategoryTags(
        book.apiCategories,
        book.categories,
        description,
        book.title,
        book.author,
      );

  return {
    pageCount: meta.pageCount,
    description,
    coverUrl: book.coverUrl ?? meta.coverUrl ?? null,
    googleBooksId: meta.googleBooksId ?? book.googleBooksId,
    apiCategories,
    categories,
  };
}

function buildMetadataPatch(
  book: BookEntry,
  updates: Partial<BookEntry>,
): Partial<BookEntry> {
  const patch: Partial<BookEntry> = {};

  if (
    !hasRealDescription(book.description) &&
    hasRealDescription(updates.description ?? null)
  ) {
    patch.description = updates.description;
  }

  if (
    !book.pageCountLocked &&
    (book.pageCount == null || book.pageCount <= 0) &&
    (updates.pageCount ?? 0) > 0 &&
    isPlausiblePageCount(updates.pageCount ?? 0)
  ) {
    patch.pageCount = updates.pageCount;
  }

  if (!book.coverUrl && updates.coverUrl) {
    patch.coverUrl = updates.coverUrl;
  }

  if (!book.googleBooksId && updates.googleBooksId) {
    patch.googleBooksId = updates.googleBooksId;
  }

  if (
    updates.apiCategories?.length &&
    updates.apiCategories.join("|") !== (book.apiCategories ?? []).join("|")
  ) {
    patch.apiCategories = updates.apiCategories;
    patch.categories = updates.categories;
  }

  return patch;
}

/** Re-fetch Google metadata for a single book (e.g. after add). */
export async function backfillSingleBookMetadata(
  book: BookEntry,
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): Promise<void> {
  if (!bookNeedsMetadataBackfill(book)) return;
  if (isGoogleBooksCircuitOpen()) return;

  const meta = await fetchMetadataFromApi(
    book,
    shouldUseLiteBackfill(book) ? { lite: true } : undefined,
  );
  if (!meta) return;

  const updates = applyMetadata(book, meta);
  const patch = buildMetadataPatch(book, updates);

  if (Object.keys(patch).length > 0) {
    onUpdate(book.id, patch);
  }
}

async function runLibraryMetadataBackfill(
  books: BookEntry[],
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): Promise<void> {
  const ordered = booksEligibleForBackfill(books)
    .sort((a, b) => {
      const aMissing = hasRealDescription(a.description) ? 0 : 1;
      const bMissing = hasRealDescription(b.description) ? 0 : 1;
      return bMissing - aMissing;
    })
    .slice(0, BACKFILL_MAX_BOOKS_PER_RUN);

  if (ordered.length === 0) return;

  const attemptedIds: string[] = [];

  for (const book of ordered) {
    if (isGoogleBooksCircuitOpen()) break;

    attemptedIds.push(book.id);
    recordBackfillAttempt(book.id);
    const meta = await fetchMetadataFromApi(
      book,
      shouldUseLiteBackfill(book) ? { lite: true } : undefined,
    );

    if (meta) {
      const updates = applyMetadata(book, meta);
      const newPages = updates.pageCount ?? 0;
      const currentPages = book.pageCount ?? 0;

      const shouldUpdatePages =
        !book.pageCountLocked &&
        newPages > 0 &&
        isPlausiblePageCount(newPages) &&
        (currentPages <= 0 || !isPlausiblePageCount(currentPages));

      const patch = buildMetadataPatch(book, updates);

      if (shouldUpdatePages) {
        patch.pageCount = newPages;
      }

      if (Object.keys(patch).length > 0) {
        onUpdate(book.id, patch);
      }
    } else {
      const categories = resolveBookCategoryTags(
        book.apiCategories,
        book.categories,
        book.description,
        book.title,
        book.author,
      );
      if (categories.join("|") !== book.categories.join("|")) {
        onUpdate(book.id, { categories });
      }
    }

    await new Promise((r) => setTimeout(r, BACKFILL_DELAY_MS));
  }

  writeBackfillSession({
    fingerprint: backfillFingerprint(books),
    attemptedAt: Date.now(),
    bookIds: attemptedIds,
  });
}

/**
 * Debounced library backfill — only books missing metadata, skipped when
 * recently attempted for the same set (e.g. page refresh).
 */
export function scheduleLibraryMetadataBackfill(
  books: BookEntry[],
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): void {
  if (shouldSkipLibraryBackfill(books)) return;

  if (backfillDebounceTimer) {
    clearTimeout(backfillDebounceTimer);
  }

  backfillDebounceTimer = setTimeout(() => {
    backfillDebounceTimer = null;
    if (backfillInFlight) return;

    backfillInFlight = true;
    void runLibraryMetadataBackfill(books, onUpdate).finally(() => {
      backfillInFlight = false;
    });
  }, BACKFILL_DEBOUNCE_MS);
}

/** @deprecated Use scheduleLibraryMetadataBackfill */
export async function backfillBookMetadata(
  books: BookEntry[],
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): Promise<void> {
  await runLibraryMetadataBackfill(books, onUpdate);
}

/** @deprecated Use backfillBookMetadata */
export const backfillMissingPageCounts = backfillBookMetadata;
