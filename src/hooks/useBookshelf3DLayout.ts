"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookEntry } from "@/lib/types";
import {
  addBookToLayout,
  autoLayoutBooks,
  loadLayout,
  moveBookToShelf,
  pruneLayout,
  saveLayout,
  type ShelfLayoutState,
} from "@/lib/bookshelf3d/layout";

export function useBookshelf3DLayout(books: BookEntry[]) {
  const [layout, setLayout] = useState<ShelfLayoutState>({ placed: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadLayout();
    setLayout(autoLayoutBooks(books, pruneLayout(books, stored)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setLayout((prev) => autoLayoutBooks(books, pruneLayout(books, prev)));
  }, [books, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLayout(layout);
  }, [layout, hydrated]);

  const moveBook = useCallback(
    (bookId: string, shelfId: string, slot: number) => {
      setLayout((prev) => moveBookToShelf(prev, bookId, shelfId, slot));
    },
    [],
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
