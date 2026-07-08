"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Clock, Sparkles, X } from "lucide-react";
import type { WrappedPeriod, WrappedStats } from "@/lib/reading-wrapped";

interface ReadingWrappedModalProps {
  period: WrappedPeriod;
  stats: WrappedStats;
  onClose: () => void;
}

export function ReadingWrappedModal({
  period,
  stats,
  onClose,
}: ReadingWrappedModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const showContent = isVisible && !isClosing;

  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

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

  function handleClose() {
    setIsClosing(true);
    window.setTimeout(onClose, 200);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[65] flex items-center justify-center p-3 transition-opacity duration-200 sm:p-6 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-wrapped-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
        onClick={handleClose}
        aria-label="Close reading wrapped"
      />

      <div
        className={`reading-wrapped-modal-panel ${
          showContent ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        }`}
      >
        <header className="reading-wrapped-modal-panel__header">
          <button
            type="button"
            onClick={handleClose}
            className="reading-wrapped-modal-panel__close"
            aria-label="Close reading wrapped"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="reading-wrapped-modal-panel__scroll">
          <div className="reading-wrapped-modal-panel__content">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="reading-wrapped-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">
                  6-Month Wrapped
                </p>
                <h2
                  id="reading-wrapped-title"
                  className="reading-wrapped-heading mt-1 text-2xl font-bold sm:text-[1.75rem]"
                >
                  {period.label}
                </h2>
                <p className="reading-wrapped-subheading mt-1.5 text-sm sm:text-base">
                  Your personal reading recap — no rankings, just your story.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <article className="reading-wrapped-stat-card sm:col-span-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-200/90" aria-hidden />
                  <p className="reading-wrapped-stat-label text-xs font-semibold uppercase tracking-wide">
                    Total reading time
                  </p>
                </div>
                <p className="reading-wrapped-stat-value mt-3 text-4xl font-bold tabular-nums sm:text-[2.75rem]">
                  {stats.totalMinutesLabel}
                </p>
                <p className="reading-wrapped-muted mt-2 text-sm">
                  {stats.sessionCount === 0
                    ? "Log timed sessions to track your minutes."
                    : `${stats.sessionCount.toLocaleString()} logged ${
                        stats.sessionCount === 1 ? "session" : "sessions"
                      } in this window.`}
                </p>
              </article>

              <article className="reading-wrapped-stat-card">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-200/90" aria-hidden />
                  <p className="reading-wrapped-stat-label text-xs font-semibold uppercase tracking-wide">
                    Peak hour
                  </p>
                </div>
                <p className="reading-wrapped-stat-value mt-3 text-lg font-bold leading-snug sm:text-xl">
                  {stats.favoriteHourLabel ?? "Not enough data yet"}
                </p>
                <p className="reading-wrapped-muted mt-2 text-sm">
                  Based on when you saved reading sessions.
                </p>
              </article>

              <article className="reading-wrapped-stat-card sm:col-span-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-200/90" aria-hidden />
                  <p className="reading-wrapped-stat-label text-xs font-semibold uppercase tracking-wide">
                    Most logged genre
                  </p>
                </div>
                <p className="reading-wrapped-stat-value mt-3 text-2xl font-bold sm:text-[1.65rem]">
                  {stats.topGenre ?? "Still exploring"}
                </p>
                <p className="reading-wrapped-muted mt-2 text-sm">
                  Genres from books you logged during this period.
                </p>
              </article>
            </div>

            <p className="reading-wrapped-footer mt-8 text-center text-xs sm:text-sm">
              Keep reading — your next recap unlocks{" "}
              {period.half === "H1" ? "in July" : "on January 1"}.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
