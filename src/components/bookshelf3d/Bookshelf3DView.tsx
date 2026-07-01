"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { BookEntry } from "@/lib/types";
import { useBookshelf3DLayout } from "@/hooks/useBookshelf3DLayout";
import { BookshelfSidebar } from "@/components/bookshelf3d/BookshelfSidebar";
import { BookshelfErrorBoundary } from "@/components/bookshelf3d/BookshelfErrorBoundary";

const BookshelfCanvas = dynamic(
  () =>
    import("@/components/bookshelf3d/BookshelfCanvas").then((m) => m.BookshelfCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-[#1a1410]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600/40 border-t-amber-500" />
      </div>
    ),
  },
);

interface Bookshelf3DViewProps {
  books: BookEntry[];
  onSelectBook: (book: BookEntry) => void;
}

export function Bookshelf3DView({ books, onSelectBook }: Bookshelf3DViewProps) {
  const [search, setSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const { layout, hydrated, placedIds, addBook, moveBook, removeFromShelf } =
    useBookshelf3DLayout(books);

  const handleSelectBook = useCallback(
    (book: BookEntry) => {
      setSelectedBookId(book.id);
      onSelectBook(book);
    },
    [onSelectBook],
  );

  if (!hydrated) {
    return (
      <div className="flex h-[min(80vh,720px)] items-center justify-center rounded-xl border border-slate-200 bg-[#1a1410]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600/40 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[min(80vh,720px)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:flex-row">
      <BookshelfSidebar
        books={books}
        placedIds={placedIds}
        search={search}
        onSearchChange={setSearch}
        onAddBook={addBook}
        onRemoveBook={removeFromShelf}
        selectedBookId={selectedBookId}
      />
      <div className="relative min-h-[420px] flex-1">
        <BookshelfErrorBoundary>
          <BookshelfCanvas
            books={books}
            layout={layout}
            selectedBookId={selectedBookId}
            onSelectBook={handleSelectBook}
            onMoveBook={moveBook}
          />
        </BookshelfErrorBoundary>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/45 px-2.5 py-1 text-xs text-amber-100/90 backdrop-blur-sm">
          Drag books between shelves · Scroll to zoom slightly
        </p>
      </div>
    </div>
  );
}
