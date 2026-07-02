"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatElapsed } from "@/lib/reading-session-timer";

interface ReadingSessionStopPromptProps {
  bookTitle: string;
  startPage: number;
  maxPage?: number | null;
  elapsedMs: number;
  defaultEndPage?: number;
  onConfirm: (endPage: number) => void;
  onCancel: () => void;
}

export function ReadingSessionStopPrompt({
  bookTitle,
  startPage,
  maxPage,
  elapsedMs,
  defaultEndPage,
  onConfirm,
  onCancel,
}: ReadingSessionStopPromptProps) {
  const [mounted, setMounted] = useState(false);
  const suggestedEnd = defaultEndPage ?? startPage;
  const [endPage, setEndPage] = useState(String(suggestedEnd));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEndPage(String(defaultEndPage ?? startPage));
  }, [startPage, defaultEndPage]);

  if (!mounted) return null;

  const parsedEnd = parseInt(endPage, 10);
  const pagesRead =
    Number.isFinite(parsedEnd) && parsedEnd >= startPage
      ? parsedEnd - startPage
      : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(parsedEnd) || parsedEnd < startPage) return;
    if (maxPage != null && maxPage > 0 && parsedEnd > maxPage) return;
    onConfirm(parsedEnd);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-session-stop-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onCancel}
        aria-label="Cancel"
      />

      <form
        onSubmit={handleSubmit}
        className="modal-panel modal-panel--md relative z-10 w-full max-w-md rounded-2xl bg-[#161618] p-6 text-white shadow-2xl ring-1 ring-white/10"
      >
        <h2
          id="reading-session-stop-title"
          className="text-lg font-semibold text-white"
        >
          End reading session
        </h2>
        <p className="mt-1 text-sm text-white/55">{bookTitle}</p>

        <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-center font-mono text-2xl tabular-nums text-white">
          {formatElapsed(elapsedMs)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
              Start page
            </label>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80">
              {startPage}
            </div>
          </div>

          <div>
            <label
              htmlFor="session-end-page"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45"
            >
              End page
            </label>
            <input
              id="session-end-page"
              type="number"
              min={startPage}
              max={maxPage && maxPage > 0 ? maxPage : undefined}
              inputMode="numeric"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0b0b0c] px-3 py-2.5 text-sm text-white outline-none ring-blue-500/0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              autoFocus
            />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-white/60">
          Pages read:{" "}
          <span className="font-semibold text-white">{pagesRead}</span>
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              !Number.isFinite(parsedEnd) ||
              parsedEnd < startPage ||
              (maxPage != null && maxPage > 0 && parsedEnd > maxPage)
            }
            className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-[#0b0b0c] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
