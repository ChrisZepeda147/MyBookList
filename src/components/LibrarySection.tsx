"use client";

import { useState } from "react";
import type { BookEntry } from "@/lib/types";
import { useFilteredBooks } from "@/hooks/useFilteredBooks";
import { BookCard } from "@/components/BookCard";
import { BookDetailModal } from "@/components/BookDetailModal";
import { BookListFilters } from "@/components/BookListFilters";
import { BookGridShelfView } from "@/components/BookGridShelfView";
import dynamic from "next/dynamic";

const PhotoBookshelfView = dynamic(
  () =>
    import("@/components/photo-bookshelf/PhotoBookshelfView").then(
      (m) => m.PhotoBookshelfView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="premium-brown-surface photo-bookshelf-shell flex h-[min(80vh,520px)] items-center justify-center rounded-xl shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200/30 border-t-amber-100" />
      </div>
    ),
  },
);

type LibraryViewMode = "list" | "grid" | "shelf";

export function LibrarySection() {
  const {
    books,
    loaded,
    filtered,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useFilteredBooks();
  const [viewMode, setViewMode] = useState<LibraryViewMode>("list");
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null);

  const detailBook = selectedBook
    ? books.find((b) => b.id === selectedBook.id) ?? null
    : null;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const viewButtons: { id: LibraryViewMode; label: string }[] = [
    { id: "list", label: "List" },
    { id: "grid", label: "Grid" },
    { id: "shelf", label: "Shelf" },
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Library</h2>
          <p className="mt-0.5 text-base text-slate-500">
            List, grid covers, or photorealistic bookshelf.
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          role="group"
          aria-label="Library view mode"
        >
          {viewButtons.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <BookListFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {filtered.length === 0 && viewMode !== "shelf" ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-lg font-medium text-slate-500">No books yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Search for a book or add one manually to get started.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="grid gap-4">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={setSelectedBook}
            />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <BookGridShelfView
          books={filtered}
          onSelect={setSelectedBook}
        />
      ) : (
        <PhotoBookshelfView books={books} onSelectBook={setSelectedBook} />
      )}

      {detailBook && (
        <BookDetailModal
          book={detailBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </section>
  );
}
