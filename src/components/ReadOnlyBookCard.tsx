"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { BookEntry } from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadges } from "@/components/CategoryBadges";
import { bookHasDisplayableCover } from "@/lib/cover-url";
import { ensureBookDescription } from "@/lib/book-descriptions";

interface ReadOnlyBookCardProps {
  book: BookEntry;
  onSelect: (book: BookEntry) => void;
}

export function ReadOnlyBookCard({ book, onSelect }: ReadOnlyBookCardProps) {
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
          onClick={() => onSelect(book)}
          className="book-description-text w-full min-w-0 text-left text-sm text-slate-500"
        >
          {ensureBookDescription(book.description)}
        </button>

        <div className="mt-auto flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Status</span>
            <StatusBadge status={book.status} />
          </div>

          {book.rating !== null && (
            <div className="min-w-[140px] flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-400">
                Rating
              </span>
              <StarRating value={book.rating} readonly />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
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
