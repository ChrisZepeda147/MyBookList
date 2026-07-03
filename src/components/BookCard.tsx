"use client";

import Image from "next/image";
import { BookOpen, Trash2 } from "lucide-react";
import type { BookEntry, ReadingStatus } from "@/lib/types";
import { READING_STATUSES } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadges } from "@/components/CategoryBadges";
import { bookHasDisplayableCover } from "@/lib/cover-url";
import { ensureBookDescription } from "@/lib/book-descriptions";

interface BookCardProps {
  book: BookEntry;
  onSelect: (book: BookEntry) => void;
  /** When true, description is capped at 2 lines (MyList library list view). */
  clampDescription?: boolean;
}

export function BookCard({
  book,
  onSelect,
  clampDescription = false,
}: BookCardProps) {
  const { setBookStatus, setBookRating, removeBook } = useBookStore();
  const canRate = book.status === "completed";
  const displayDescription = ensureBookDescription(book.description);

  if (!bookHasDisplayableCover(book, "list")) {
    return null;
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:flex-row">
      <button
        type="button"
        onClick={() => onSelect(book)}
        className="relative h-48 w-full shrink-0 bg-slate-100 sm:h-auto sm:w-32"
      >
        <Image
          src={book.coverUrl!}
          alt={book.title}
          fill
          className="object-cover"
          unoptimized
        />
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(book)}
            className="text-left"
          >
            <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
              {book.title}
            </h3>
            <p className="text-sm text-slate-500">{book.author}</p>
            <div className="mt-2">
              <CategoryBadges
                categories={book.categories}
                apiCategories={book.apiCategories}
                description={book.description}
                title={book.title}
                subtitle={book.subtitle}
                author={book.author}
              />
            </div>
            {book.pageCount !== null && book.pageCount > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600">
                <BookOpen className="h-3 w-3" />
                {book.pageCount} pages
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeBook(book.id);
            }}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            aria-label="Remove book"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelect(book)}
          className={`w-full min-w-0 text-left text-sm text-slate-500 ${
            clampDescription ? "book-description-clamp" : ""
          }`}
        >
          {displayDescription}
        </button>

        <div
          className="mt-auto flex flex-wrap items-end gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400">Status</label>
            <select
              value={book.status}
              onChange={(e) =>
                setBookStatus(book.id, e.target.value as ReadingStatus)
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {READING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Rating
            </label>
            <StarRating
              value={book.rating}
              onChange={(v) => setBookRating(book.id, v)}
              disabled={!canRate}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={book.status} />
          {book.dateCompleted && (
            <span className="text-xs text-slate-400">
              Completed{" "}
              {new Date(book.dateCompleted).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
