"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookEntry } from "@/lib/types";
import {
  addBookToLayout,
  autoLayoutBooks,
  loadLayout,
  moveBookOnShelf,
  pruneLayout,
  saveLayout,
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

/**
 * Shelf-only layout hook. Re-fetches from Supabase on every mount (revalidateOnMount)
 * so mobile stays in sync with desktop rearrangements.
 */
export function usePhotoBookshelfShelfLayout(
  books: BookEntry[],
  userId: string | undefined,
  options?: UsePhotoBookshelfShelfLayoutOptions,
) {
  const persist = options?.persist ?? true;
  const [layout, setLayout] = useState<ShelfLayoutState>({ placed: [] });
  const [hydrated, setHydrated] = useState(false);
  const booksRef = useRef(books);
  booksRef.current = books;

  useEffect(() => {
    if (!userId) {
      setLayout({ placed: [] });
      setHydrated(false);
      return;
    }

    let cancelled = false;
    setHydrated(false);

    void (async () => {
      const currentBooks = booksRef.current;
      let stored: ShelfLayoutState | null = null;

      const supabase = createClient();
      if (supabase) {
        try {
          stored = await fetchShelfLayout(supabase, userId);
          if (stored && persist) {
            saveLayout(stored, userId);
          }
        } catch (err) {
          console.error(
            "[usePhotoBookshelfShelfLayout] Failed to fetch shelf layout:",
            err,
          );
        }
      }

      if (!stored || stored.placed.length === 0) {
        const local = loadLayout(currentBooks, userId);
        if (local.placed.length > 0) {
          stored = local;
          if (persist && supabase) {
            void saveShelfLayout(supabase, userId, local).catch((err) => {
              console.error(
                "[usePhotoBookshelfShelfLayout] Failed to migrate shelf layout:",
                err,
              );
            });
          }
        }
      }

      if (!stored) {
        stored = { placed: [] };
      }

      if (cancelled) return;

      setLayout(
        autoLayoutBooks(currentBooks, pruneLayout(currentBooks, stored)),
      );
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, persist]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    setLayout((prev) =>
      autoLayoutBooks(books, pruneLayout(books, prev)),
    );
  }, [books, hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !userId || !persist) return;

    saveLayout(layout, userId);

    const supabase = createClient();
    if (!supabase) return;

    void saveShelfLayout(supabase, userId, layout).catch((err) => {
      console.error(
        "[usePhotoBookshelfShelfLayout] Failed to save shelf layout:",
        err,
      );
    });
  }, [layout, hydrated, userId, persist]);

  const moveBook = useCallback(
    (bookId: string, row: number, xPct: number) => {
      setLayout((prev) =>
        moveBookOnShelf(booksRef.current, prev, bookId, row, xPct),
      );
    },
    [],
  );

  const addBook = useCallback(
    (bookId: string) => {
      setLayout((prev) =>
        addBookToLayout(booksRef.current, prev, bookId),
      );
    },
    [],
  );

  const removeFromShelf = useCallback((bookId: string) => {
    setLayout((prev) => ({
      placed: prev.placed.filter((p) => p.bookId !== bookId),
    }));
  }, []);

  const placedIds = new Set(layout.placed.map((p) => p.bookId));

  return {
    layout,
    hydrated,
    placedIds,
    addBook,
    moveBook,
    removeFromShelf,
  };
}
