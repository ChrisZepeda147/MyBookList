"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, PenLine, Sparkles } from "lucide-react";
import { useReadingSessionTimer } from "@/hooks/useReadingSessionTimer";
import { resolveReadingStartPage } from "@/lib/reading-session-timer";
import {
  clearReadingSessionUiState,
  persistActiveReadingSession,
} from "@/lib/reading-session-ui";
import {
  DIAMOND_STAR_MINUTES,
  RED_STAR_MINUTES,
  liveMilestonesCrossed,
  milestoneLabel,
  type DailyStarTier,
} from "@/lib/daily-reading-stars";
import { toLocalDateKey } from "@/lib/reading-streak";
import { celebrateStarMilestone } from "@/lib/celebration-confetti";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import { ReadingSessionStopPrompt } from "@/components/ReadingSessionStopPrompt";
import { ReadingSessionCancelPrompt } from "@/components/ReadingSessionCancelPrompt";
import { UntimedReadingSessionPrompt } from "@/components/UntimedReadingSessionPrompt";

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
  onSessionCancel?: () => void;
  onSessionComplete?: (payload: ReadingSessionCompletePayload) => void;
}

const READING_SESSION_PANEL_CLASS =
  "modal-panel modal-panel--reading-session relative z-10 flex w-full flex-col overflow-hidden rounded-2xl bg-[#0a0a0a] shadow-2xl ring-1 ring-white/10 transition-all duration-200";

const MILESTONE_BADGE_MS = 3200;

/** Compact modal reading timer — warm book photo, serif typography. */
export function ReadingSessionView({
  bookId,
  bookTitle,
  bookAuthor,
  currentPage,
  pageCount,
  isClosing = false,
  onBack,
  onSessionCancel,
  onSessionComplete,
}: ReadingSessionViewProps) {
  const [mounted, setMounted] = useState(false);
  const [showStopPrompt, setShowStopPrompt] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showUntimedSession, setShowUntimedSession] = useState(false);
  const [pendingElapsedMs, setPendingElapsedMs] = useState(0);
  const [pendingStartPage, setPendingStartPage] = useState(1);
  const [milestoneBadge, setMilestoneBadge] = useState<string | null>(null);
  const [panelFlash, setPanelFlash] = useState(false);
  const celebratedRef = useRef<Set<Exclude<DailyStarTier, "none">>>(new Set());
  const previousTotalRef = useRef(0);

  const { dailyMinutes } = useReadingSessionLog();
  const todayKey = toLocalDateKey(new Date());
  const savedMinutesToday = dailyMinutes.get(todayKey) ?? 0;

  const defaultStartPage = resolveReadingStartPage(currentPage);

  const {
    hydrated,
    isIdle,
    isRunning,
    isPaused,
    formattedTime,
    displayMs,
    sessionStartPage,
    getElapsedMs,
    handleStart,
    handleRestart,
    handlePause,
    handleResume,
    handleStop,
    handlePauseAndPersist,
    handleCancelSession,
  } = useReadingSessionTimer(bookId, defaultStartPage);

  const liveTotalMinutes = useMemo(
    () => savedMinutesToday + displayMs / 60_000,
    [displayMs, savedMinutesToday],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    celebratedRef.current = new Set();
    previousTotalRef.current = savedMinutesToday;
    if (savedMinutesToday > 0) {
      celebratedRef.current.add("gold");
    }
    if (savedMinutesToday >= RED_STAR_MINUTES) {
      celebratedRef.current.add("red");
    }
    if (savedMinutesToday >= DIAMOND_STAR_MINUTES) {
      celebratedRef.current.add("diamond");
    }
  }, [bookId, savedMinutesToday]);

  useEffect(() => {
    if (isIdle) return;

    const previous = previousTotalRef.current;
    const next = liveTotalMinutes;
    previousTotalRef.current = next;

    const crossed = liveMilestonesCrossed(previous, next).filter(
      (tier) => !celebratedRef.current.has(tier),
    );
    if (crossed.length === 0) return;

    for (const tier of crossed) {
      celebratedRef.current.add(tier);
      void celebrateStarMilestone(tier);
      setMilestoneBadge(milestoneLabel(tier));
      setPanelFlash(true);
    }
  }, [isIdle, liveTotalMinutes]);

  useEffect(() => {
    if (!milestoneBadge) return;
    const id = window.setTimeout(() => setMilestoneBadge(null), MILESTONE_BADGE_MS);
    return () => window.clearTimeout(id);
  }, [milestoneBadge]);

  useEffect(() => {
    if (!panelFlash) return;
    const id = window.setTimeout(() => setPanelFlash(false), 700);
    return () => window.clearTimeout(id);
  }, [panelFlash]);

  const sessionSnapshot = {
    id: bookId,
    title: bookTitle,
    author: bookAuthor,
    currentPage,
    pageCount,
  };

  const persistSessionActive = useCallback(() => {
    persistActiveReadingSession(bookId, sessionSnapshot);
  }, [bookAuthor, bookId, bookTitle, currentPage, pageCount]);

  const hasActiveTimer = isRunning || isPaused;

  useEffect(() => {
    if (!hydrated) return;
    if (hasActiveTimer) {
      persistSessionActive();
    }
  }, [hasActiveTimer, hydrated, persistSessionActive]);

  useEffect(() => {
    if (!hydrated || !hasActiveTimer) return;

    function persistBeforeBackground() {
      persistSessionActive();
    }

    document.addEventListener("visibilitychange", persistBeforeBackground);
    window.addEventListener("pagehide", persistBeforeBackground);

    return () => {
      document.removeEventListener("visibilitychange", persistBeforeBackground);
      window.removeEventListener("pagehide", persistBeforeBackground);
    };
  }, [hasActiveTimer, hydrated, persistSessionActive]);

  function handleStartSession() {
    handleStart();
    persistSessionActive();
  }

  function handlePauseSession() {
    handlePause();
    persistSessionActive();
  }

  function handleResumeSession() {
    handleResume();
    persistSessionActive();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key !== "Escape" ||
        showStopPrompt ||
        showCancelPrompt ||
        showUntimedSession
      ) {
        return;
      }
      if (isRunning) {
        handlePauseAndPersist();
        persistSessionActive();
        return;
      }
      if (isPaused) return;
      clearReadingSessionUiState();
      onBack();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [
    handlePauseAndPersist,
    isPaused,
    isRunning,
    onBack,
    persistSessionActive,
    showStopPrompt,
    showCancelPrompt,
    showUntimedSession,
  ]);

  function handleBack() {
    if (showStopPrompt || showCancelPrompt || showUntimedSession) return;
    if (isRunning) {
      handlePauseAndPersist();
      persistSessionActive();
      return;
    }
    if (isPaused) return;
    clearReadingSessionUiState();
    onBack();
  }

  function handleSaveSessionClick() {
    if (isIdle) return;
    if (isRunning) handlePause();
    persistSessionActive();
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
    clearReadingSessionUiState();
    onSessionComplete?.({
      elapsedMs,
      startPage,
      endPage,
    });
    onBack();
  }

  function handleCancelSessionClick() {
    if (showStopPrompt || showCancelPrompt) return;
    setShowCancelPrompt(true);
  }

  function handleDismissCancelPrompt() {
    setShowCancelPrompt(false);
  }

  function handleConfirmCancelSession() {
    setShowCancelPrompt(false);
    handleCancelSession();
    clearReadingSessionUiState();
    onSessionCancel?.();
    onBack();
  }

  function handleUntimedSessionConfirm(endPage: number) {
    const startPage = resolveReadingStartPage(currentPage);
    setShowUntimedSession(false);
    clearReadingSessionUiState();
    onSessionComplete?.({
      elapsedMs: 0,
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
            } ${panelFlash ? "reading-session-milestone-flash" : ""}`}
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

            {milestoneBadge && (
              <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-4">
                <div className="reading-session-milestone-badge inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-black/40 ring-1 ring-white/60">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {milestoneBadge}
                </div>
              </div>
            )}

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
              <h2 className="font-display max-w-full truncate px-2 text-[2.0625rem] font-bold leading-tight text-white sm:text-[2.4125rem]">
                {bookTitle}
              </h2>
              <p className="mt-2 text-lg text-white/50">
                by {bookAuthor}
              </p>
              {(currentPage ?? 0) > 0 && (
                <p className="mt-3 inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/30">
                  Page {currentPage}
                </p>
              )}

              <p
                className="font-display mt-8 text-[3.8125rem] font-semibold leading-none tracking-[0.03em] text-white tabular-nums sm:text-[4.8125rem]"
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
                <div className="mt-10 flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition-opacity hover:text-white/85"
                  >
                    START
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUntimedSession(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3.5 py-1.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25"
                  >
                    <PenLine className="h-4 w-4" />
                    Log Pages
                  </button>
                </div>
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
                  onClick={isRunning ? handlePauseSession : handleResumeSession}
                  disabled={isIdle}
                  className="rounded-full bg-[#2a2a2e] py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#34343a] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isRunning ? "PAUSE" : "RESUME"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessionClick}
                  disabled={isIdle}
                  className="rounded-full bg-[#dc3b3b] py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#c93434] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  SAVE SESSION
                </button>
              </div>
              {!isIdle && (
                <button
                  type="button"
                  onClick={handleCancelSessionClick}
                  className="mt-3 w-full rounded-full border border-white/15 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Cancel Session
                </button>
              )}
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
      {showCancelPrompt && (
        <ReadingSessionCancelPrompt
          bookTitle={bookTitle}
          onConfirm={handleConfirmCancelSession}
          onDismiss={handleDismissCancelPrompt}
        />
      )}
      {showUntimedSession && (
        <UntimedReadingSessionPrompt
          bookTitle={bookTitle}
          startPage={resolveReadingStartPage(currentPage)}
          maxPage={pageCount}
          onConfirm={handleUntimedSessionConfirm}
          onCancel={() => setShowUntimedSession(false)}
        />
      )}
    </>
  );
}
