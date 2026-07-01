"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useShelfLayout(
  books: BookEntry[],
  userId: string | undefined,
  options?: { persist?: boolean },
) {
  const persist = options?.persist ?? true;
  const [layout, setLayout] = useState<ShelfLayoutState>({ placed: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLayout({ placed: [] });
      setHydrated(false);
      return;
    }

    if (!persist) {
      setLayout(autoLayoutBooks(books, { placed: [] }));
      setHydrated(true);
      return;
    }

    const stored = loadLayout(books, userId);
    setLayout(autoLayoutBooks(books, pruneLayout(books, stored)));
    setHydrated(true);
  }, [userId, persist]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    setLayout((prev) => autoLayoutBooks(books, pruneLayout(books, prev)));
  }, [books, hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !userId || !persist) return;
    saveLayout(layout, userId);
  }, [layout, hydrated, userId, persist]);

  const moveBook = useCallback(
    (bookId: string, row: number, xPct: number) => {
      setLayout((prev) => moveBookOnShelf(books, prev, bookId, row, xPct));
    },
    [books],
  );

  const addBook = useCallback(
    (bookId: string) => {
      setLayout((prev) => addBookToLayout(books, prev, bookId));
    },
    [books],
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
