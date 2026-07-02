"use client";

import { useState } from "react";
import type { BookEntry, ReadingStatus } from "@/lib/types";
import { useFilteredBooks } from "@/hooks/useFilteredBooks";
import { BookCard } from "@/components/BookCard";
import { BookDetailModal } from "@/components/BookDetailModal";
import { BookListFilters } from "@/components/BookListFilters";

interface BookListProps {
  /** Lock the list to a single reading status. */
  fixedStatus?: ReadingStatus;
  /** Hide the status filter pills (e.g. on the Currently Reading page). */
  hideStatusFilter?: boolean;
}

export function BookList({
  fixedStatus,
  hideStatusFilter = false,
}: BookListProps = {}) {
  const {
    books,
    loaded,
    filtered,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useFilteredBooks({ fixedStatus });
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

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <BookListFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        hideStatusFilter={hideStatusFilter || fixedStatus != null}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-lg font-medium text-slate-500">No books yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Search for a book or add one manually to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={setSelectedBook}
            />
          ))}
        </div>
      )}

      {detailBook && (
        <BookDetailModal
          book={detailBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
