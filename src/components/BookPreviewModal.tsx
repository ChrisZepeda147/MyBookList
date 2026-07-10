"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import type { BookSearchResult, ReadingStatus } from "@/lib/types";
import { READING_STATUSES } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";
import { clampRating } from "@/lib/ratings";
import { resolveBookCategoryTags } from "@/lib/categories";
import {
  ensureBookDescription,
  hasRealDescription,
  isPlaceholderDescription,
  descriptionForStorage,
} from "@/lib/book-descriptions";
import {
  fetchBookMetadataClient,
  fetchVolumeDescriptionClient,
} from "@/lib/fetch-book-metadata-client";
import { normalizeTitle, primaryAuthor } from "@/lib/google-books-client";
import { bookHasDisplayableCover } from "@/lib/cover-url";
import { StarRating } from "@/components/StarRating";
import { CategoryBadges } from "@/components/CategoryBadges";
import { BookModalAbout, BookModalLayout } from "@/components/BookModalLayout";

interface BookPreviewModalProps {
  book: BookSearchResult;
  onClose: () => void;
  onAdded: () => void;
}

function isAlreadyInLibrary(
  book: BookSearchResult,
  library: { title: string; author: string; googleBooksId?: string }[],
): boolean {
  const titleKey = normalizeTitle(book.title);
  const authorKey = primaryAuthor(book.author).toLowerCase();

  return library.some((b) => {
    if (book.id && !book.id.startsWith("ol-") && b.googleBooksId === book.id) {
      return true;
    }
    return (
      normalizeTitle(b.title) === titleKey &&
      primaryAuthor(b.author).toLowerCase() === authorKey
    );
  });
}

export function BookPreviewModal({
  book,
  onClose,
  onAdded,
}: BookPreviewModalProps) {
  const { books, addBook } = useBookStore();
  const [isClosing, setIsClosing] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>("plan_to_read");
  const [rating, setRating] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(
    book.pageCount ?? null,
  );
  const [description, setDescription] = useState(
    ensureBookDescription(book.description),
  );
  const [descriptionLoading, setDescriptionLoading] = useState(
    isPlaceholderDescription(book.description),
  );

  const canRate = status === "completed";
  const alreadyAdded = isAlreadyInLibrary(book, books);
  const volumeId = book.id.startsWith("ol-") ? null : book.id;
  const waitingForDescription = Boolean(volumeId) && descriptionLoading;

  function animateClose(callback: () => void) {
    setIsClosing(true);
    window.setTimeout(callback, 200);
  }

  function handleClose() {
    animateClose(onClose);
  }

  function handleAdd() {
    if (alreadyAdded) return;

    addBook({
      title: book.title,
      subtitle: book.subtitle ?? null,
      author: book.author,
      coverUrl: book.coverUrl,
      description: descriptionForStorage(description),
      pageCount,
      apiCategories: book.apiCategories ?? [],
      categories: resolveBookCategoryTags(
        book.apiCategories,
        book.categories,
        description,
        book.title,
        book.author,
        book.subtitle,
      ),
      status,
      rating: canRate && rating != null ? clampRating(rating) : null,
      dateCompleted: status === "completed" ? new Date().toISOString() : null,
      googleBooksId: book.id.startsWith("ol-") ? undefined : book.id,
    });

    animateClose(onAdded);
  }

  useEffect(() => {
    setDescription(ensureBookDescription(book.description));
    setDescriptionLoading(isPlaceholderDescription(book.description));
  }, [book.id, book.description]);

  useEffect(() => {
    const volumeId = book.id.startsWith("ol-") ? null : book.id;
    if (!volumeId) return;

    let cancelled = false;
    const showLoading = !hasRealDescription(book.description);
    if (showLoading) setDescriptionLoading(true);

    void (async () => {
      const direct = await fetchVolumeDescriptionClient(volumeId);
      if (cancelled) return;

      if (hasRealDescription(direct)) {
        setDescription(direct!);
        setDescriptionLoading(false);
        return;
      }

      const meta = await fetchBookMetadataClient({
        title: book.title,
        author: book.author,
        googleBooksId: volumeId,
        isbn: book.isbn13 ?? book.isbn10 ?? null,
      });

      if (!cancelled && meta && hasRealDescription(meta.description)) {
        setDescription(meta.description);
      }
    })().finally(() => {
      if (!cancelled && showLoading) setDescriptionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [book.id, book.title, book.author, book.isbn13, book.isbn10]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (status !== "completed") setRating(null);
  }, [status]);

  if (!bookHasDisplayableCover(book, "list")) {
    return null;
  }

  return (
    <BookModalLayout
      titleId="book-preview-title"
      coverUrl={book.coverUrl}
      coverAlt={book.title}
      isClosing={isClosing}
      onClose={handleClose}
      footer={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col items-start gap-1">
            <label
              htmlFor="preview-page-count"
              className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
            >
              Page count
            </label>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <input
                id="preview-page-count"
                type="number"
                min={1}
                max={9999}
                placeholder="—"
                value={pageCount ?? ""}
                disabled={alreadyAdded}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setPageCount(null);
                    return;
                  }
                  const n = parseInt(raw, 10);
                  if (!Number.isNaN(n) && n > 0) setPageCount(n);
                }}
                className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              />
              <span className="text-xs text-slate-400">pages</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={alreadyAdded || waitingForDescription}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Plus className="h-4 w-4" />
            {waitingForDescription ? "Loading description…" : "Add to List"}
          </button>
        </div>
      }
    >
      <div className="shrink-0">
        <h2
          id="book-preview-title"
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

      {pageCount !== null && pageCount > 0 && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          <BookOpen className="h-4 w-4" />
          {pageCount} pages
        </span>
      )}

      <BookModalAbout
        description={description}
        loading={descriptionLoading}
        isPlaceholder={isPlaceholderDescription(description)}
      />

      <div className="grid shrink-0 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            Reading Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReadingStatus)}
            disabled={alreadyAdded}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
          >
            {READING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            Your Rating
          </label>
          <StarRating
            value={rating}
            onChange={setRating}
            disabled={!canRate || alreadyAdded}
          />
        </div>
      </div>

      {alreadyAdded && (
        <p className="text-sm text-amber-700">
          This book is already in your list.
        </p>
      )}
    </BookModalLayout>
  );
}
