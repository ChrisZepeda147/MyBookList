"use client";

import Image from "next/image";
import type { BookEntry } from "@/lib/types";
import { bookHasDisplayableCover } from "@/lib/cover-url";
import { chunkBooksForShelves } from "@/lib/library-shelves";

interface BookGridShelfViewProps {
  books: BookEntry[];
  onSelect: (book: BookEntry) => void;
  booksPerShelf?: number;
}

function CoverOnShelf({
  book,
  onSelect,
}: {
  book: BookEntry;
  onSelect: (book: BookEntry) => void;
}) {
  if (!bookHasDisplayableCover(book, "list")) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="group w-full min-w-0 shrink-0"
      title={book.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-black/30 shadow-[0_8px_16px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_20px_rgba(0,0,0,0.55)]">
        <Image
          src={book.coverUrl!}
          alt={book.title}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    </button>
  );
}

/** Grid view — cover-forward books on CSS wooden shelves. Do not modify for shelf view work. */
export function BookGridShelfView({
  books,
  onSelect,
  booksPerShelf = 7,
}: BookGridShelfViewProps) {
  const shelves = chunkBooksForShelves(books, booksPerShelf);

  return (
    <div className="library-grid-bookshelf rounded-2xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="space-y-10">
        {shelves.map((row, shelfIndex) => (
          <div key={shelfIndex} className="library-grid-shelf-row relative">
            <div className="relative z-[1] grid min-h-[9.5rem] grid-cols-7 items-end gap-1 sm:min-h-[11rem] sm:gap-2">
              {row.map((book) => (
                <CoverOnShelf
                  key={book.id}
                  book={book}
                  onSelect={onSelect}
                />
              ))}
            </div>
            <div className="library-grid-shelf-plank relative z-[2] mt-1" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
