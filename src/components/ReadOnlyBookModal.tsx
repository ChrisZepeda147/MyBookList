"use client";

import { useCallback, useState } from "react";
import { BookOpen, Calendar } from "lucide-react";
import type { BookEntry } from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadges } from "@/components/CategoryBadges";
import { ensureBookDescription } from "@/lib/book-descriptions";
import { BookModalAbout, BookModalLayout } from "@/components/BookModalLayout";

interface ReadOnlyBookModalProps {
  book: BookEntry;
  onClose: () => void;
}

export function ReadOnlyBookModal({ book, onClose }: ReadOnlyBookModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const description = ensureBookDescription(book.description);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  return (
    <BookModalLayout
      titleId="readonly-book-title"
      coverUrl={book.coverUrl}
      coverAlt={book.title}
      isClosing={isClosing}
      onClose={handleClose}
    >
      <div>
        <h2
          id="readonly-book-title"
          className="pr-8 text-xl font-bold leading-snug text-slate-900"
        >
          {book.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{book.author}</p>
        <div className="mt-2">
          <CategoryBadges
            categories={book.categories}
            apiCategories={book.apiCategories}
            description={description}
            title={book.title}
            subtitle={book.subtitle}
            author={book.author}
            compact
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={book.status} />
        {book.pageCount !== null && book.pageCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <BookOpen className="h-4 w-4" />
            {book.pageCount} pages
          </span>
        )}
        {book.status === "reading" && (book.currentPage ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Page {book.currentPage}
          </span>
        )}
        {book.rating !== null && (
          <StarRating value={book.rating} readonly size="sm" />
        )}
      </div>

      <BookModalAbout
        description={description}
        loading={false}
        isPlaceholder={false}
      />

      <p className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5" />
        Added{" "}
        {new Date(book.addedAt).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </BookModalLayout>
  );
}
