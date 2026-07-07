"use client";

import type { BookEntry } from "@/lib/types";
import { chunkBooksForShelves } from "@/lib/library-shelves";
import {
  spineColorForBook,
  spineHeightForBook,
  spineLeanForBook,
  spineWidthForBook,
} from "@/lib/library-spine";

interface BookSpineShelfViewProps {
  books: BookEntry[];
  onSelect: (book: BookEntry) => void;
  booksPerShelf?: number;
}

function SpineOnShelf({
  book,
  onSelect,
}: {
  book: BookEntry;
  onSelect: (book: BookEntry) => void;
}) {
  const spineColor = spineColorForBook(book.id);
  const spineWidth = spineWidthForBook(book.id, book.title);
  const spineLean = spineLeanForBook(book.id);
  const spineHeightRem = spineHeightForBook(book.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="group shrink-0 self-end"
      title={`${book.title} — ${book.author}`}
      style={{ width: spineWidth }}
    >
      <div
        className="origin-bottom"
        style={{ transform: `rotate(${spineLean}deg)` }}
      >
        <div className="transition-transform duration-300 group-hover:-translate-y-1">
          <div
            className="library-book-spine relative flex items-center justify-center overflow-hidden rounded-t-[3px] border border-black/35"
            style={{
              width: spineWidth,
              height: `${spineHeightRem}rem`,
              ["--spine-color" as string]: spineColor,
            }}
          >
            <span
              className="library-spine-title font-display relative z-[1] max-h-[88%] overflow-hidden px-0.5 text-center text-[8px] font-semibold leading-snug tracking-wide text-amber-50/95 antialiased sm:text-[9px]"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {book.title}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/** Shelf view — pure CSS 3D empty bookcase; only books from the user's library. */
export function BookSpineShelfView({
  books,
  onSelect,
  booksPerShelf = 8,
}: BookSpineShelfViewProps) {
  const shelves = chunkBooksForShelves(books, booksPerShelf);

  if (shelves.length === 0) return null;

  return (
    <div className="library-spine-bookshelf rounded-2xl px-3 py-6 sm:px-5 sm:py-8">
      <div className="library-spine-case overflow-hidden rounded-lg">
        {shelves.map((row, shelfIndex) => (
          <div key={shelfIndex} className="library-spine-shelf-row">
            <div className="library-spine-alcove flex min-h-[10.5rem] items-end justify-start gap-2 px-5 sm:min-h-[11.5rem] sm:gap-3 sm:px-10">
              {row.map((book) => (
                <SpineOnShelf
                  key={book.id}
                  book={book}
                  onSelect={onSelect}
                />
              ))}
            </div>
            <div className="library-spine-shelf-plank" aria-hidden />
          </div>
        ))}
        <div className="library-spine-base" aria-hidden />
      </div>
    </div>
  );
}
