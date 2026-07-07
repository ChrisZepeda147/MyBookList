"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearReadingSession,
  computeElapsedMs,
  createIdleSession,
  formatElapsed,
  hydrateReadingSession,
  pauseSession,
  resolveReadingStartPage,
  restartSession,
  resumeSession,
  startSession,
  stopSession,
  syncIdleSessionStartPage,
  writeReadingSession,
  type ReadingSessionState,
  type ReadingSessionStatus,
} from "@/lib/reading-session-timer";

export function useReadingSessionTimer(
  bookId: string,
  defaultStartPage = 1,
) {
  const progressPage = resolveReadingStartPage(defaultStartPage);
  const progressPageRef = useRef(progressPage);

  useEffect(() => {
    progressPageRef.current = progressPage;
  }, [progressPage]);

  const [session, setSession] = useState<ReadingSessionState>(() =>
    createIdleSession(bookId, progressPage),
  );
  const [displayMs, setDisplayMs] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const syncDisplay = useCallback((nextSession: ReadingSessionState) => {
    setDisplayMs(computeElapsedMs(nextSession));
  }, []);

  useEffect(() => {
    const initial = hydrateReadingSession(bookId, progressPage);
    setSession(initial);
    syncDisplay(initial);
    setHydrated(true);
  }, [bookId, progressPage, syncDisplay]);

  useEffect(() => {
    if (!hydrated) return;

    setSession((current) => {
      const next = syncIdleSessionStartPage(current, progressPage);
      if (next === current) return current;
      return next;
    });
  }, [hydrated, progressPage]);

  useEffect(() => {
    syncDisplay(session);
  }, [session, syncDisplay]);

  useEffect(() => {
    const refresh = () => {
      setDisplayMs(computeElapsedMs(sessionRef.current));
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (session.status !== "running") return;

    const id = window.setInterval(() => {
      setDisplayMs(computeElapsedMs(sessionRef.current));
    }, 250);

    return () => window.clearInterval(id);
  }, [session.status, session.segmentStartedAt]);

  const getElapsedMs = useCallback(() => {
    return computeElapsedMs(sessionRef.current);
  }, []);

  const handleStart = useCallback(() => {
    const startPage = progressPageRef.current;
    const next = startSession(bookId, startPage);
    setSession(next);
    syncDisplay(next);
  }, [bookId, syncDisplay]);

  const handleRestart = useCallback(() => {
    const startPage = progressPageRef.current;
    const next = restartSession(bookId, startPage);
    setSession(next);
    syncDisplay(next);
  }, [bookId, syncDisplay]);

  const handlePause = useCallback(() => {
    setSession((current) => {
      if (current.status !== "running") return current;
      const next = pauseSession(current);
      syncDisplay(next);
      return next;
    });
  }, [syncDisplay]);

  const handleResume = useCallback(() => {
    setSession((current) => {
      if (current.status !== "paused") return current;
      const next = resumeSession(current);
      syncDisplay(next);
      return next;
    });
  }, [syncDisplay]);

  const handleStop = useCallback((nextStartPage?: number) => {
    const current = sessionRef.current;
    const elapsedMs = stopSession(current);
    const carryPage = resolveReadingStartPage(
      nextStartPage ?? progressPageRef.current,
    );
    const idle = createIdleSession(bookId, carryPage);
    writeReadingSession(idle);
    setSession(idle);
    setDisplayMs(elapsedMs);
    return { elapsedMs, startPage: current.startPage };
  }, [bookId]);

  const handlePauseAndPersist = useCallback(() => {
    setSession((current) => {
      if (current.status !== "running") return current;
      const next = pauseSession(current);
      syncDisplay(next);
      return next;
    });
  }, [syncDisplay]);

  const handleCancelSession = useCallback(() => {
    clearReadingSession(bookId);
    const idle = createIdleSession(bookId, progressPageRef.current);
    setSession(idle);
    setDisplayMs(0);
  }, [bookId]);

  const status: ReadingSessionStatus = session.status;
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isIdle = status === "idle";
  const formattedTime = formatElapsed(displayMs);

  return {
    hydrated,
    session,
    status,
    isRunning,
    isPaused,
    isIdle,
    formattedTime,
    displayMs,
    sessionStartPage: session.startPage,
    getElapsedMs,
    handleStart,
    handleRestart,
    handlePause,
    handleResume,
    handleStop,
    handlePauseAndPersist,
    handleCancelSession,
  };
}
