"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookEntry } from "@/lib/types";
import {
  addBookToLayout,
  autoLayoutBooks,
  EMPTY_SHELF_LAYOUT,
  loadLayout,
  moveBookOnShelf,
  normalizeShelfLayout,
  pruneLayout,
  saveLayout,
  seedShelfLayoutFromBooks,
  type ShelfLayoutState,
} from "@/lib/photo-bookshelf/layout";
import { createClient } from "@/lib/supabase/client";
import {
  fetchShelfLayout,
  saveShelfLayout,
} from "@/lib/storage/supabase-db";

interface UsePhotoBookshelfShelfLayoutOptions {
  persist?: boolean;
}

const SAVE_DEBOUNCE_MS = 450;

function layoutsEqual(a: ShelfLayoutState, b: ShelfLayoutState): boolean {
  return (
    JSON.stringify(normalizeShelfLayout(a).placed) ===
    JSON.stringify(normalizeShelfLayout(b).placed)
  );
}

function resolveDisplayLayout(
  stored: ShelfLayoutState,
  books: BookEntry[],
): ShelfLayoutState {
  const normalized = normalizeShelfLayout(stored);
  if (normalized.placed.length === 0) {
    return seedShelfLayoutFromBooks(books);
  }
  return autoLayoutBooks(books, pruneLayout(books, normalized));
}

/**
 * Shelf layout hook — fetches from profiles.shelf_layout once per mount/user.
 * Drag updates are optimistic; persistence is debounced in the background.
 */
export function usePhotoBookshelfShelfLayout(
  books: BookEntry[],
  userId: string | undefined,
  options?: UsePhotoBookshelfShelfLayoutOptions,
) {
  const persist = options?.persist ?? true;
  const [layout, setLayout] = useState<ShelfLayoutState>(EMPTY_SHELF_LAYOUT);
  const [hydrated, setHydrated] = useState(false);

  const booksRef = useRef(books);
  booksRef.current = books;

  const hasSavedLayoutRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLayoutRef = useRef<ShelfLayoutState | null>(null);

  const bookIdsKey = useMemo(
    () => books.map((book) => book.id).join("|"),
    [books],
  );

  const scheduleBackgroundSave = useCallback(
    (nextLayout: ShelfLayoutState) => {
      if (!userId || !persist) return;

      const safeLayout = normalizeShelfLayout(nextLayout);
      saveLayout(safeLayout, userId);
      pendingLayoutRef.current = safeLayout;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        const layoutToSave = pendingLayoutRef.current;
        if (!layoutToSave || !userId) return;

        const supabase = createClient();
        if (!supabase) return;

        void saveShelfLayout(supabase, userId, layoutToSave).then((saved) => {
          if (saved) {
            hasSavedLayoutRef.current = true;
          }
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [persist, userId],
  );

  // Mount-only fetch: runs when userId/persist changes — never when books update.
  useEffect(() => {
    fetchGenerationRef.current += 1;
    const generation = fetchGenerationRef.current;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingLayoutRef.current = null;
    hasSavedLayoutRef.current = false;

    if (!userId) {
      setLayout(EMPTY_SHELF_LAYOUT);
      setHydrated(false);
      return;
    }

    setHydrated(false);
    setLayout(EMPTY_SHELF_LAYOUT);

    void (async () => {
      const currentBooks = booksRef.current;
      let stored = EMPTY_SHELF_LAYOUT;

      const supabase = createClient();
      if (supabase) {
        try {
          stored = normalizeShelfLayout(await fetchShelfLayout(supabase, userId));
          if (stored.placed.length > 0) {
            hasSavedLayoutRef.current = true;
            if (persist) {
              saveLayout(stored, userId);
            }
          }
        } catch (err) {
          console.warn(
            "[usePhotoBookshelfShelfLayout] Fetch failed — using defaults:",
            err,
          );
        }
      }

      if (stored.placed.length === 0) {
        const local = normalizeShelfLayout(loadLayout(currentBooks, userId));
        if (local.placed.length > 0) {
          stored = local;
          hasSavedLayoutRef.current = true;
          if (persist && supabase) {
            void saveShelfLayout(supabase, userId, local);
          }
        }
      }

      if (generation !== fetchGenerationRef.current) return;

      setLayout(resolveDisplayLayout(stored, currentBooks));
      setHydrated(true);
    })();

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [userId, persist]);

  // Merge newly added books locally — no refetch, no automatic remote save.
  useEffect(() => {
    if (!hydrated || !userId) return;

    setLayout((prev) => {
      const next = autoLayoutBooks(
        booksRef.current,
        pruneLayout(booksRef.current, prev),
      );
      return layoutsEqual(prev, next) ? prev : next;
    });
  }, [bookIdsKey, hydrated, userId]);

  const moveBook = useCallback(
    (bookId: string, row: number, xPct: number) => {
      setLayout((prev) => {
        const seeded =
          (prev.placed?.length ?? 0) > 0
            ? prev
            : seedShelfLayoutFromBooks(booksRef.current);

        const next = moveBookOnShelf(
          booksRef.current,
          seeded,
          bookId,
          row,
          xPct,
        );

        if (!layoutsEqual(seeded, next)) {
          scheduleBackgroundSave(next);
        }

        return next;
      });
    },
    [scheduleBackgroundSave],
  );

  const addBook = useCallback(
    (bookId: string) => {
      setLayout((prev) => {
        const next = addBookToLayout(booksRef.current, prev, bookId);
        if (hasSavedLayoutRef.current && !layoutsEqual(prev, next)) {
          scheduleBackgroundSave(next);
        }
        return next;
      });
    },
    [scheduleBackgroundSave],
  );

  const removeFromShelf = useCallback(
    (bookId: string) => {
      setLayout((prev) => {
        const next = {
          placed: (prev.placed ?? []).filter((p) => p.bookId !== bookId),
        };
        if (hasSavedLayoutRef.current && !layoutsEqual(prev, next)) {
          scheduleBackgroundSave(next);
        }
        return next;
      });
    },
    [scheduleBackgroundSave],
  );

  const placedIds = new Set((layout.placed ?? []).map((p) => p.bookId));

  return {
    layout: normalizeShelfLayout(layout),
    hydrated,
    placedIds,
    addBook,
    moveBook,
    removeFromShelf,
  };
}
