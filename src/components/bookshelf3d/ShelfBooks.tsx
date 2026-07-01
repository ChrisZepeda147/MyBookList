"use client";

import { useCallback, useMemo, useState } from "react";
import type { BookEntry } from "@/lib/types";
import {
  nearestShelfAndSlot,
  transformForPlacement,
  type PlacedBook,
  type ShelfLayoutState,
} from "@/lib/bookshelf3d/layout";
import { BookMesh } from "@/components/bookshelf3d/BookMesh";

interface ShelfBooksProps {
  books: BookEntry[];
  layout: ShelfLayoutState;
  selectedBookId: string | null;
  onSelectBook: (book: BookEntry) => void;
  onMoveBook: (bookId: string, shelfId: string, slot: number) => void;
}

export function ShelfBooks({
  books,
  layout,
  selectedBookId,
  onSelectBook,
  onMoveBook,
}: ShelfBooksProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const bookById = useMemo(
    () => new Map(books.map((b) => [b.id, b])),
    [books],
  );

  const placements = useMemo(() => {
    return layout.placed
      .map((p) => {
        const book = bookById.get(p.bookId);
        if (!book) return null;
        const transform = transformForPlacement(book, p);
        if (!transform) return null;
        return { book, placement: p, transform };
      })
      .filter(Boolean) as {
      book: BookEntry;
      placement: PlacedBook;
      transform: NonNullable<ReturnType<typeof transformForPlacement>>;
    }[];
  }, [layout.placed, bookById]);

  const handleDrag = useCallback(
    (bookId: string, x: number, y: number) => {
      if (!draggingId || draggingId !== bookId) return;
      const target = nearestShelfAndSlot(x, y);
      if (target) onMoveBook(bookId, target.shelfId, target.slot);
    },
    [draggingId, onMoveBook],
  );

  return (
    <group>
      {placements.map(({ book, transform }) => (
        <BookMesh
          key={book.id}
          book={book}
          transform={transform}
          hovered={hoveredId === book.id}
          selected={selectedBookId === book.id}
          onPointerOver={() => setHoveredId(book.id)}
          onPointerOut={() => setHoveredId((id) => (id === book.id ? null : id))}
          onClick={() => onSelectBook(book)}
          onDragStart={() => setDraggingId(book.id)}
          onDrag={(x, y) => handleDrag(book.id, x, y)}
          onDragEnd={() => setDraggingId(null)}
        />
      ))}
    </group>
  );
}
