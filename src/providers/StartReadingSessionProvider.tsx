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
  persistReadingSessionModalBookId,
  readReadingSessionModalBookId,
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
    setSessionBookId(readReadingSessionModalBookId());
    setUiHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiHydrated) return;
    persistReadingSessionModalBookId(sessionBookId);
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
