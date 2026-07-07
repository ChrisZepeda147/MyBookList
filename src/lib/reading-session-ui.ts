const READING_SESSION_MODAL_BOOK_KEY = "reading_session_modal_book_id";
const READING_SESSION_ACTIVE_KEY = "isReadingSessionActive";

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

/** Persist active timer + modal book id so the session modal can reopen after reload. */
export function persistActiveReadingSession(bookId: string): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(READING_SESSION_ACTIVE_KEY, "true");
    localStorage.setItem(READING_SESSION_MODAL_BOOK_KEY, bookId);
  } catch {
    // Ignore.
  }
}

export function clearReadingSessionUiState(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(READING_SESSION_ACTIVE_KEY);
    localStorage.removeItem(READING_SESSION_MODAL_BOOK_KEY);
  } catch {
    // Ignore.
  }
}
