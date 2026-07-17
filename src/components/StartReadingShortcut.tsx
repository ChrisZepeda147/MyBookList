"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Timer } from "lucide-react";
import { useStartReadingSession } from "@/providers/StartReadingSessionProvider";
import { useBookStore } from "@/providers/BookStoreProvider";

export function StartReadingShortcut() {
  const { books, loaded } = useBookStore();
  const { openSession } = useStartReadingSession();
  const readingBooks = useMemo(
    () => books.filter((book) => book.status === "reading"),
    [books],
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const hasActiveReading = readingBooks.length > 0;

  useEffect(() => {
    if (readingBooks.length === 0) {
      setSelectedId("");
      return;
    }
    setSelectedId((current) => {
      if (current && readingBooks.some((book) => book.id === current)) {
        return current;
      }
      return readingBooks[0]?.id ?? "";
    });
  }, [readingBooks]);

  const handleStartMultiple = useCallback(() => {
    if (!hasActiveReading) return;
    const book = readingBooks.find((b) => b.id === selectedId);
    if (book) openSession(book);
  }, [hasActiveReading, openSession, readingBooks, selectedId]);

  if (!loaded) {
    return null;
  }

  if (!hasActiveReading) {
    return (
      <div
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 text-left opacity-90"
        aria-disabled="true"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">
            Reading session locked
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Change book status to &ldquo;reading&rdquo; to start a reading session.
          </p>
        </div>
        <span className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-none">
          <Lock className="h-4 w-4" />
          Start Reading
        </span>
      </div>
    );
  }

  if (readingBooks.length === 1) {
    const book = readingBooks[0]!;
    return (
      <button
        type="button"
        onClick={() => openSession(book)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 text-left transition-colors hover:border-emerald-300 hover:from-emerald-100"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">
            Continue reading
          </p>
          <p className="mt-0.5 truncate text-xs text-emerald-700/80">
            {book.title}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20">
          <Timer className="h-4 w-4" />
          Start Reading
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-900">
          {readingBooks.length} books in progress
        </p>
        <p className="mt-0.5 text-xs text-emerald-700/80">
          Choose a book to open the reading timer.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="start-reading-book-select">
          Select book to track
        </label>
        <select
          id="start-reading-book-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:min-w-[14rem]"
        >
          {readingBooks.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleStartMultiple}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
        >
          <Timer className="h-4 w-4" />
          Start Reading
        </button>
      </div>
    </div>
  );
}
