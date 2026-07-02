"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { useReadingSessionTimer } from "@/hooks/useReadingSessionTimer";
import { resolveReadingStartPage } from "@/lib/reading-session-timer";
import { ReadingSessionStopPrompt } from "@/components/ReadingSessionStopPrompt";

export interface ReadingSessionCompletePayload {
  elapsedMs: number;
  startPage: number;
  endPage: number;
}

interface ReadingSessionViewProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  currentPage?: number | null;
  pageCount?: number | null;
  isClosing?: boolean;
  onBack: () => void;
  onSessionComplete?: (payload: ReadingSessionCompletePayload) => void;
}

const READING_SESSION_PANEL_CLASS =
  "mobile-modal-panel mobile-modal-panel--wide relative z-10 flex max-h-[min(92vh,50rem)] w-full max-w-[45rem] flex-col overflow-hidden rounded-2xl bg-[#0a0a0a] shadow-2xl ring-1 ring-white/10 transition-all duration-200 sm:max-h-[min(90vh,45rem)]";

/** Compact modal reading timer — warm book photo, serif typography. */
export function ReadingSessionView({
  bookId,
  bookTitle,
  bookAuthor,
  currentPage,
  pageCount,
  isClosing = false,
  onBack,
  onSessionComplete,
}: ReadingSessionViewProps) {
  const [mounted, setMounted] = useState(false);
  const [showStopPrompt, setShowStopPrompt] = useState(false);
  const [pendingElapsedMs, setPendingElapsedMs] = useState(0);
  const [pendingStartPage, setPendingStartPage] = useState(1);

  const defaultStartPage = resolveReadingStartPage(currentPage);

  const {
    hydrated,
    isIdle,
    isRunning,
    isPaused,
    formattedTime,
    sessionStartPage,
    getElapsedMs,
    handleStart,
    handleRestart,
    handlePause,
    handleResume,
    handleStop,
    handlePauseAndPersist,
  } = useReadingSessionTimer(bookId, defaultStartPage);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !showStopPrompt) {
        if (isRunning) handlePauseAndPersist();
        onBack();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handlePauseAndPersist, isRunning, onBack, showStopPrompt]);

  function handleBack() {
    if (showStopPrompt) return;
    if (isRunning) handlePauseAndPersist();
    onBack();
  }

  function handleStopClick() {
    if (isIdle) return;
    if (isRunning) handlePause();
    setPendingElapsedMs(getElapsedMs());
    setPendingStartPage(
      Math.max(sessionStartPage, defaultStartPage),
    );
    setShowStopPrompt(true);
  }

  function handleCancelStop() {
    setShowStopPrompt(false);
  }

  function handleConfirmStop(endPage: number) {
    const { elapsedMs, startPage } = handleStop(endPage);
    setShowStopPrompt(false);
    onSessionComplete?.({
      elapsedMs,
      startPage,
      endPage,
    });
    onBack();
  }

  if (!mounted || !hydrated) return null;

  return (
    <>
      {createPortal(
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={`Reading session for ${bookTitle}`}
        >
          <button
            type="button"
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
              isClosing ? "opacity-0" : "opacity-100"
            }`}
            onClick={handleBack}
            aria-label="Close reading session"
          />

          <div
            className={`${READING_SESSION_PANEL_CLASS} ${
              isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {/* Open book — warm top-lit atmosphere matching reference */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/reading-session-book-spread.png"
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-[0.58] contrast-[1.08] brightness-[1.12] sepia-[0.18]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 via-[#1a1410]/25 via-40% to-[#0a0a0a]/92"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center_36%,rgba(255,215,160,0.14)_0%,transparent_52%)]"
              aria-hidden
            />

            <header className="relative z-10 flex shrink-0 items-center px-4 pb-1 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="-ml-1 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Back to book details"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </header>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-4 pt-2 text-center">
              <h2 className="font-reading max-w-full truncate px-2 text-[2rem] font-medium leading-tight text-white sm:text-[2.35rem]">
                {bookTitle}
              </h2>
              <p className="font-reading mt-2 text-lg text-white/50">
                by {bookAuthor}
              </p>

              <p
                className="font-reading mt-8 text-[3.75rem] font-normal leading-none tracking-[0.03em] text-white tabular-nums sm:text-[4.75rem]"
                aria-live="polite"
                aria-label="Session timer"
              >
                {formattedTime}
              </p>

              <button
                type="button"
                onClick={handleRestart}
                disabled={isIdle}
                className="mt-8 min-w-[9.5rem] rounded-full bg-white px-10 py-3 text-sm font-semibold tracking-wide text-[#121214] shadow-lg shadow-black/40 transition-transform hover:bg-white/95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Restart
              </button>

              {isIdle ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="mt-10 text-sm font-semibold uppercase tracking-[0.35em] text-white transition-opacity hover:text-white/85"
                >
                  START
                </button>
              ) : (
                <p className="mt-10 text-sm font-semibold uppercase tracking-[0.35em] text-white/45">
                  {isRunning ? "Reading…" : "Paused"}
                </p>
              )}
            </div>

            <footer className="relative z-10 shrink-0 px-5 pb-5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={isRunning ? handlePause : handleResume}
                  disabled={isIdle}
                  className="rounded-full bg-[#2a2a2e] py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#34343a] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isRunning ? "PAUSE" : "RESUME"}
                </button>
                <button
                  type="button"
                  onClick={handleStopClick}
                  disabled={isIdle}
                  className="rounded-full bg-[#dc3b3b] py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#c93434] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  STOP
                </button>
              </div>
            </footer>
          </div>
        </div>,
        document.body,
      )}

      {showStopPrompt && (
        <ReadingSessionStopPrompt
          bookTitle={bookTitle}
          startPage={pendingStartPage}
          maxPage={pageCount}
          elapsedMs={pendingElapsedMs}
          defaultEndPage={Math.max(pendingStartPage, defaultStartPage)}
          onConfirm={handleConfirmStop}
          onCancel={handleCancelStop}
        />
      )}
    </>
  );
}
