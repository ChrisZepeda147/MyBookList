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
import { clearReadingSession } from "@/lib/reading-session-timer";
import {
  clearReadingSessionUiState,
  readReadingSessionBookSnapshot,
  resolveStoredActiveSessionBookId,
  type ReadingSessionBookSnapshot,
} from "@/lib/reading-session-ui";
import { useAuth } from "@/providers/AuthProvider";
import { useBookStore } from "@/providers/BookStoreProvider";

interface StartReadingSessionContextValue {
  openSession: (book: BookEntry) => void;
  closeSession: () => void;
  sessionBookId: string | null;
}

const StartReadingSessionContext =
  createContext<StartReadingSessionContextValue | null>(null);

function readInitialSessionBookId(): string | null {
  if (typeof window === "undefined") return null;
  return resolveStoredActiveSessionBookId();
}

function readInitialSnapshot(): ReadingSessionBookSnapshot | null {
  if (typeof window === "undefined") return null;
  return readReadingSessionBookSnapshot();
}

export function StartReadingSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { books, loaded, setCurrentPage } = useBookStore();
  const { user } = useAuth();
  const [sessionBookId, setSessionBookId] = useState<string | null>(
    readInitialSessionBookId,
  );
  const [restoredSnapshot, setRestoredSnapshot] =
    useState<ReadingSessionBookSnapshot | null>(readInitialSnapshot);
  const [uiHydrated, setUiHydrated] = useState(false);

  useEffect(() => {
    setUiHydrated(true);
  }, []);

  const restoreActiveSession = useCallback(() => {
    const storedId = resolveStoredActiveSessionBookId();
    if (!storedId) return;
    setSessionBookId((current) => current ?? storedId);
    const snapshot = readReadingSessionBookSnapshot();
    if (snapshot?.id === storedId) {
      setRestoredSnapshot(snapshot);
    }
  }, []);

  useEffect(() => {
    restoreActiveSession();
  }, [restoreActiveSession]);

  useEffect(() => {
    if (!uiHydrated) return;

    document.addEventListener("visibilitychange", restoreActiveSession);
    window.addEventListener("pageshow", restoreActiveSession);
    window.addEventListener("focus", restoreActiveSession);

    return () => {
      document.removeEventListener("visibilitychange", restoreActiveSession);
      window.removeEventListener("pageshow", restoreActiveSession);
      window.removeEventListener("focus", restoreActiveSession);
    };
  }, [restoreActiveSession, uiHydrated]);

  useEffect(() => {
    if (!loaded) return;
    restoreActiveSession();
  }, [loaded, restoreActiveSession]);

  const sessionBook = useMemo(
    () => books.find((book) => book.id === sessionBookId) ?? null,
    [books, sessionBookId],
  );

  const displaySession = useMemo((): ReadingSessionBookSnapshot | null => {
    if (!sessionBookId) return null;
    if (sessionBook) {
      return {
        id: sessionBook.id,
        title: sessionBook.title,
        author: sessionBook.author,
        currentPage: sessionBook.currentPage,
        pageCount: sessionBook.pageCount,
      };
    }
    if (restoredSnapshot?.id === sessionBookId) {
      return restoredSnapshot;
    }
    if (!resolveStoredActiveSessionBookId()) return null;
    return {
      id: sessionBookId,
      title: "Your book",
      author: "",
      currentPage: null,
      pageCount: null,
    };
  }, [restoredSnapshot, sessionBook, sessionBookId]);

  useEffect(() => {
    if (!uiHydrated || !loaded || !sessionBookId) return;

    const storedId = resolveStoredActiveSessionBookId();
    if (!storedId) {
      setSessionBookId(null);
      setRestoredSnapshot(null);
      return;
    }

    if (storedId !== sessionBookId) {
      setSessionBookId(storedId);
      return;
    }

    if (!books.some((book) => book.id === sessionBookId)) {
      clearReadingSession(sessionBookId);
      clearReadingSessionUiState();
      setSessionBookId(null);
      setRestoredSnapshot(null);
    }
  }, [books, sessionBookId, uiHydrated, loaded]);

  const openSession = useCallback((book: BookEntry) => {
    setSessionBookId(book.id);
    setRestoredSnapshot({
      id: book.id,
      title: book.title,
      author: book.author,
      currentPage: book.currentPage,
      pageCount: book.pageCount,
    });
  }, []);

  const closeSession = useCallback(() => {
    setSessionBookId(null);
  }, []);

  const handleSessionCancel = useCallback(() => {
    clearReadingSessionUiState();
    setSessionBookId(null);
    setRestoredSnapshot(null);
  }, []);

  const handleSessionComplete = useCallback(
    (payload: ReadingSessionCompletePayload) => {
      const book =
        sessionBook ??
        (restoredSnapshot?.id === sessionBookId ? restoredSnapshot : null);
      if (!book || !sessionBookId) return;

      setCurrentPage(sessionBookId, payload.endPage);
      if (user?.id) {
        appendReadingSessionLog(
          user.id,
          buildSessionLogEntry({
            bookId: sessionBookId,
            bookTitle: book.title,
            bookAuthor: book.author,
            startPage: payload.startPage,
            endPage: payload.endPage,
            elapsedMs: payload.elapsedMs,
          }),
        );
      }
      clearReadingSessionUiState();
      setSessionBookId(null);
      setRestoredSnapshot(null);
    },
    [
      restoredSnapshot,
      sessionBook,
      sessionBookId,
      setCurrentPage,
      user?.id,
    ],
  );

  return (
    <StartReadingSessionContext.Provider
      value={{ openSession, closeSession, sessionBookId }}
    >
      {children}
      {uiHydrated && displaySession && (
        <ReadingSessionView
          bookId={displaySession.id}
          bookTitle={displaySession.title}
          bookAuthor={displaySession.author}
          currentPage={displaySession.currentPage}
          pageCount={displaySession.pageCount}
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
