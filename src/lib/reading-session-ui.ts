import { readReadingSession } from "@/lib/reading-session-timer";

const READING_SESSION_MODAL_BOOK_KEY = "reading_session_modal_book_id";
const READING_SESSION_ACTIVE_KEY = "isReadingSessionActive";
const READING_SESSION_BOOK_SNAPSHOT_KEY = "reading_session_book_snapshot";

export interface ReadingSessionBookSnapshot {
  id: string;
  title: string;
  author: string;
  currentPage?: number | null;
  pageCount?: number | null;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readReadingSessionActive(): boolean {
  if (!canUseStorage()) return false;
  try {
    return localStorage.getItem(READING_SESSION_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

export function readReadingSessionModalBookId(): string | null {
  if (!canUseStorage()) return null;
  try {
    const id = localStorage.getItem(READING_SESSION_MODAL_BOOK_KEY);
    return id?.trim() ? id : null;
  } catch {
    return null;
  }
}

export function readReadingSessionBookSnapshot(): ReadingSessionBookSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(READING_SESSION_BOOK_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReadingSessionBookSnapshot;
    if (!parsed?.id?.trim() || !parsed.title?.trim()) return null;
    return {
      id: parsed.id,
      title: parsed.title,
      author: parsed.author ?? "",
      currentPage: parsed.currentPage ?? null,
      pageCount: parsed.pageCount ?? null,
    };
  } catch {
    return null;
  }
}

/** Book id for an in-progress timer (active flag or running/paused timer blob). */
export function resolveStoredActiveSessionBookId(): string | null {
  const bookId = readReadingSessionModalBookId();
  if (!bookId) return null;
  if (readReadingSessionActive()) return bookId;
  const stored = readReadingSession(bookId);
  if (stored?.status === "running" || stored?.status === "paused") {
    return bookId;
  }
  return null;
}

/** Persist active timer + modal book id so the session modal can reopen after reload. */
export function persistActiveReadingSession(
  bookId: string,
  snapshot?: ReadingSessionBookSnapshot,
): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(READING_SESSION_ACTIVE_KEY, "true");
    localStorage.setItem(READING_SESSION_MODAL_BOOK_KEY, bookId);
    if (snapshot) {
      localStorage.setItem(
        READING_SESSION_BOOK_SNAPSHOT_KEY,
        JSON.stringify(snapshot),
      );
    }
  } catch {
    // Ignore.
  }
}

export function clearReadingSessionUiState(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(READING_SESSION_ACTIVE_KEY);
    localStorage.removeItem(READING_SESSION_MODAL_BOOK_KEY);
    localStorage.removeItem(READING_SESSION_BOOK_SNAPSHOT_KEY);
  } catch {
    // Ignore.
  }
}
