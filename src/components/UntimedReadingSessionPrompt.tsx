"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface UntimedReadingSessionPromptProps {
  bookTitle: string;
  startPage: number;
  maxPage?: number | null;
  onConfirm: (endPage: number) => void;
  onCancel: () => void;
}

export function UntimedReadingSessionPrompt({
  bookTitle,
  startPage,
  maxPage,
  onConfirm,
  onCancel,
}: UntimedReadingSessionPromptProps) {
  const [mounted, setMounted] = useState(false);
  const [pagesRead, setPagesRead] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  if (!mounted) return null;

  const parsedPages = parseInt(pagesRead, 10);
  const endPage =
    Number.isFinite(parsedPages) && parsedPages > 0
      ? startPage + parsedPages
      : startPage;
  const exceedsMax =
    maxPage != null && maxPage > 0 && endPage > maxPage;
  const isValid =
    Number.isFinite(parsedPages) && parsedPages > 0 && !exceedsMax;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(endPage);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="untimed-reading-session-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onCancel}
        aria-label="Cancel"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <h2
          id="untimed-reading-session-title"
          className="text-lg font-semibold text-slate-900"
        >
          Log pages read
        </h2>
        <p className="mt-1 text-sm text-slate-500">{bookTitle}</p>
        <p className="mt-2 text-sm text-slate-500">
          Forgot to start the timer? Log your pages and they&apos;ll still count
          toward your streak and history.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Start page
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {startPage}
            </div>
          </div>

          <div>
            <label
              htmlFor="untimed-pages-read"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400"
            >
              Pages read
            </label>
            <input
              id="untimed-pages-read"
              type="number"
              min={1}
              max={
                maxPage != null && maxPage > startPage
                  ? maxPage - startPage
                  : undefined
              }
              inputMode="numeric"
              value={pagesRead}
              onChange={(e) => setPagesRead(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">
          End page:{" "}
          <span className="font-semibold text-slate-900">
            {isValid ? endPage : "—"}
          </span>
        </p>

        {exceedsMax && (
          <p className="mt-2 text-center text-xs text-red-600">
            That exceeds this book&apos;s page count ({maxPage} pages).
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
