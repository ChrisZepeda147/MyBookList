"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ReadingSessionCancelPromptProps {
  bookTitle: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ReadingSessionCancelPrompt({
  bookTitle,
  onConfirm,
  onDismiss,
}: ReadingSessionCancelPromptProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-session-cancel-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onDismiss}
        aria-label="Keep reading"
      />

      <div className="modal-panel modal-panel--md relative z-10 w-full max-w-md rounded-2xl bg-[#161618] p-6 text-white shadow-2xl ring-1 ring-white/10">
        <h2
          id="reading-session-cancel-title"
          className="text-lg font-semibold text-white"
        >
          Are you sure?
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Your reading session for <span className="text-white/80">{bookTitle}</span>{" "}
          will be discarded and won&apos;t be saved.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Keep reading
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#dc3b3b] py-2.5 text-sm font-semibold text-white transition hover:bg-[#c93434]"
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
