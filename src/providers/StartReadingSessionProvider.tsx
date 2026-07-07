"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BookEntry } from "@/lib/types";
import {
  ReadingSessionView,
  type ReadingSessionCompletePayload,
} from "@/components/ReadingSessionView";
import {
  appendReadingSessionLog,
  buildSessionLogEntry,
} from "@/lib/reading-session-log";
import {
  clearReadingSessionUiState,
  readReadingSessionActive,
  readReadingSessionModalBookId,
} from "@/lib/reading-session-ui";
import { readReadingSession } from "@/lib/reading-session-timer";
import { useAuth } from "@/providers/AuthProvider";
import { useBookStore } from "@/providers/BookStoreProvider";

interface StartReadingSessionContextValue {
  openSession: (book: BookEntry) => void;
  closeSession: () => void;
  sessionBookId: string | null;
}

const StartReadingSessionContext =
  createContext<StartReadingSessionContextValue | null>(null);

export function StartReadingSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { books, setCurrentPage } = useBookStore();
  const { user } = useAuth();
  const [sessionBookId, setSessionBookId] = useState<string | null>(null);
  const [uiHydrated, setUiHydrated] = useState(false);

  useEffect(() => {
    const bookId = readReadingSessionModalBookId();
    const active = readReadingSessionActive();
    if (bookId && active) {
      setSessionBookId(bookId);
    } else if (bookId) {
      const stored = readReadingSession(bookId);
      if (stored?.status === "running" || stored?.status === "paused") {
        setSessionBookId(bookId);
      }
    }
    setUiHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiHydrated) return;

    function restoreActiveSession() {
      if (sessionBookId) return;
      const bookId = readReadingSessionModalBookId();
      if (!bookId || !readReadingSessionActive()) return;
      setSessionBookId(bookId);
    }

    document.addEventListener("visibilitychange", restoreActiveSession);
    window.addEventListener("pageshow", restoreActiveSession);
    window.addEventListener("focus", restoreActiveSession);

    return () => {
      document.removeEventListener("visibilitychange", restoreActiveSession);
      window.removeEventListener("pageshow", restoreActiveSession);
      window.removeEventListener("focus", restoreActiveSession);
    };
  }, [sessionBookId, uiHydrated]);

  const sessionBook = useMemo(
    () => books.find((book) => book.id === sessionBookId) ?? null,
    [books, sessionBookId],
  );

  useEffect(() => {
    if (!uiHydrated || !sessionBookId) return;
    if (!sessionBook) {
      setSessionBookId(null);
    }
  }, [sessionBook, sessionBookId, uiHydrated]);

  const openSession = useCallback((book: BookEntry) => {
    setSessionBookId(book.id);
  }, []);

  const closeSession = useCallback(() => {
    setSessionBookId(null);
  }, []);

  const handleSessionCancel = useCallback(() => {
    clearReadingSessionUiState();
    setSessionBookId(null);
  }, []);

  const handleSessionComplete = useCallback(
    (payload: ReadingSessionCompletePayload) => {
      if (!sessionBook) return;
      setCurrentPage(sessionBook.id, payload.endPage);
      if (user?.id) {
        appendReadingSessionLog(
          user.id,
          buildSessionLogEntry({
            bookId: sessionBook.id,
            bookTitle: sessionBook.title,
            bookAuthor: sessionBook.author,
            startPage: payload.startPage,
            endPage: payload.endPage,
            elapsedMs: payload.elapsedMs,
          }),
        );
      }
      clearReadingSessionUiState();
      setSessionBookId(null);
    },
    [sessionBook, setCurrentPage, user?.id],
  );

  return (
    <StartReadingSessionContext.Provider
      value={{ openSession, closeSession, sessionBookId }}
    >
      {children}
      {uiHydrated && sessionBook && (
        <ReadingSessionView
          bookId={sessionBook.id}
          bookTitle={sessionBook.title}
          bookAuthor={sessionBook.author}
          currentPage={sessionBook.currentPage}
          pageCount={sessionBook.pageCount}
          onBack={closeSession}
          onSessionCancel={handleSessionCancel}
          onSessionComplete={handleSessionComplete}
        />
      )}
    </StartReadingSessionContext.Provider>
  );
}

export function useStartReadingSession() {
  const context = useContext(StartReadingSessionContext);
  if (!context) {
    throw new Error(
      "useStartReadingSession must be used within StartReadingSessionProvider",
    );
  }
  return context;
}
