"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Calendar, PenLine, Timer, Trash2 } from "lucide-react";
import type { BookEntry, ReadingStatus } from "@/lib/types";
import { READING_STATUSES } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadges } from "@/components/CategoryBadges";
import {
  ensureBookDescription,
  hasRealDescription,
  isPlaceholderDescription,
} from "@/lib/book-descriptions";
import {
  fetchBookMetadataClient,
  fetchVolumeDescriptionClient,
} from "@/lib/fetch-book-metadata-client";
import { BookModalAbout, BookModalLayout } from "@/components/BookModalLayout";
import {
  ReadingSessionView,
  type ReadingSessionCompletePayload,
} from "@/components/ReadingSessionView";
import { UntimedReadingSessionPrompt } from "@/components/UntimedReadingSessionPrompt";
import { useAuth } from "@/providers/AuthProvider";
import { resolveReadingStartPage } from "@/lib/reading-session-timer";
import {
  appendReadingSessionLog,
  buildSessionLogEntry,
} from "@/lib/reading-session-log";

interface BookDetailModalProps {
  book: BookEntry;
  onClose: () => void;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromDateInputValue(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

export function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const { user } = useAuth();
  const {
    setBookStatus,
    setBookRating,
    setDateCompleted,
    setPageCount,
    setCurrentPage,
    updateBook,
    removeBook,
  } = useBookStore();
  const [isClosing, setIsClosing] = useState(false);
  const [description, setDescription] = useState(
    ensureBookDescription(book.description),
  );
  const [descriptionLoading, setDescriptionLoading] = useState(
    isPlaceholderDescription(book.description),
  );
  const [showReadingSession, setShowReadingSession] = useState(false);
  const [showUntimedSession, setShowUntimedSession] = useState(false);
  const canRate = book.status === "completed";
  const isReading = book.status === "reading";

  function animateClose(callback: () => void) {
    setIsClosing(true);
    window.setTimeout(callback, 200);
  }

  const handleClose = useCallback(() => {
    setShowReadingSession(false);
    setShowUntimedSession(false);
    animateClose(onClose);
  }, [onClose]);

  const handleRemove = useCallback(() => {
    removeBook(book.id);
    handleClose();
  }, [book.id, handleClose, removeBook]);

  const handleBackFromSession = useCallback(() => {
    setShowReadingSession(false);
  }, []);

  const handleSessionCancel = useCallback(() => {
    setShowReadingSession(false);
  }, []);

  const logReadingSession = useCallback(
    (startPage: number, endPage: number, elapsedMs: number) => {
      setCurrentPage(book.id, endPage);

      if (user?.id) {
        appendReadingSessionLog(
          user.id,
          buildSessionLogEntry({
            bookId: book.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            startPage,
            endPage,
            elapsedMs,
          }),
        );
      }
    },
    [book.id, book.title, book.author, setCurrentPage, user?.id],
  );

  const handleSessionComplete = useCallback(
    (payload: ReadingSessionCompletePayload) => {
      logReadingSession(payload.startPage, payload.endPage, payload.elapsedMs);
    },
    [logReadingSession],
  );

  const handleUntimedSessionConfirm = useCallback(
    (endPage: number) => {
      const startPage = resolveReadingStartPage(book.currentPage);
      logReadingSession(startPage, endPage, 0);
      setShowUntimedSession(false);
    },
    [book.currentPage, logReadingSession],
  );

  useEffect(() => {
    setShowReadingSession(false);
    setShowUntimedSession(false);
  }, [book.id]);

  useEffect(() => {
    if (!isReading) {
      setShowReadingSession(false);
      setShowUntimedSession(false);
    }
  }, [isReading]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        !showReadingSession &&
        !showUntimedSession
      ) {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleClose, showReadingSession, showUntimedSession]);

  useEffect(() => {
    setDescription(ensureBookDescription(book.description));
    setDescriptionLoading(isPlaceholderDescription(book.description));
  }, [book.id, book.description]);

  useEffect(() => {
    if (!isPlaceholderDescription(book.description)) return;

    let cancelled = false;
    setDescriptionLoading(true);

    void (async () => {
      if (book.googleBooksId) {
        const direct = await fetchVolumeDescriptionClient(book.googleBooksId);
        if (cancelled) return;

        if (hasRealDescription(direct)) {
          setDescription(direct!);
          updateBook(book.id, { description: direct! });
          return;
        }
      }

      const meta = await fetchBookMetadataClient({
        title: book.title,
        author: book.author,
        googleBooksId: book.googleBooksId,
      });

      if (!cancelled && meta && hasRealDescription(meta.description)) {
        setDescription(meta.description);
        updateBook(book.id, { description: meta.description });
      }
    })().finally(() => {
      if (!cancelled) setDescriptionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    book.id,
    book.title,
    book.author,
    book.googleBooksId,
    book.description,
    updateBook,
  ]);

  if (showReadingSession && isReading) {
    return (
      <ReadingSessionView
        bookId={book.id}
        bookTitle={book.title}
        bookAuthor={book.author}
        currentPage={book.currentPage}
        pageCount={book.pageCount}
        isClosing={isClosing}
        onBack={handleBackFromSession}
        onSessionCancel={handleSessionCancel}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  return (
    <BookModalLayout
        titleId="book-detail-title"
        coverUrl={book.coverUrl}
        coverAlt={book.title}
        isClosing={isClosing}
        onClose={handleClose}
      footer={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col items-start gap-1">
              <label
                htmlFor={`page-count-${book.id}`}
                className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
              >
                Page count
              </label>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                <input
                  id={`page-count-${book.id}`}
                  type="number"
                  min={1}
                  max={9999}
                  placeholder="—"
                  value={book.pageCount ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      setPageCount(book.id, null);
                      return;
                    }
                    const n = parseInt(raw, 10);
                    if (!Number.isNaN(n) && n > 0) {
                      setPageCount(book.id, n);
                    }
                  }}
                  className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-xs text-slate-400">pages</span>
              </div>
            </div>

            {book.status === "completed" && (
              <div className="flex flex-col items-end gap-1">
                <label
                  htmlFor={`completed-date-${book.id}`}
                  className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                >
                  Date completed
                </label>
                <input
                  id={`completed-date-${book.id}`}
                  type="date"
                  value={toDateInputValue(book.dateCompleted)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateCompleted(book.id, fromDateInputValue(e.target.value));
                    }
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Remove from library
          </button>
        </div>
      }
    >
      <div className="shrink-0">
        <h2
          id="book-detail-title"
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

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <StatusBadge status={book.status} />
        {isReading && (
          <>
            <button
              type="button"
              onClick={() => setShowReadingSession(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition-colors hover:bg-emerald-700"
            >
              <Timer className="h-4 w-4" />
              Start Reading Session
            </button>
            <button
              type="button"
              onClick={() => setShowUntimedSession(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <PenLine className="h-4 w-4" />
              Log Pages
            </button>
          </>
        )}
        {book.pageCount !== null && book.pageCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <BookOpen className="h-4 w-4" />
            {book.pageCount} pages
            {book.pageCountLocked && (
              <span className="text-[11px] font-normal text-blue-500">
                (edited)
              </span>
            )}
          </span>
        )}
        {isReading && (book.currentPage ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Page {book.currentPage}
          </span>
        )}
        {book.rating !== null && canRate && (
          <StarRating value={book.rating} readonly size="sm" />
        )}
      </div>

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
            value={book.status}
            onChange={(e) =>
              setBookStatus(book.id, e.target.value as ReadingStatus)
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            value={book.rating}
            onChange={(v) => setBookRating(book.id, v)}
            disabled={!canRate}
          />
        </div>
      </div>

      <p className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5" />
        Added{" "}
        {new Date(book.addedAt).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {showUntimedSession && isReading && (
        <UntimedReadingSessionPrompt
          bookTitle={book.title}
          startPage={resolveReadingStartPage(book.currentPage)}
          maxPage={book.pageCount}
          onConfirm={handleUntimedSessionConfirm}
          onCancel={() => setShowUntimedSession(false)}
        />
      )}
    </BookModalLayout>
  );
}
