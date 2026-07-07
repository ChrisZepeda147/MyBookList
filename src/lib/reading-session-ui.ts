const READING_SESSION_MODAL_BOOK_KEY = "reading_session_modal_book_id";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
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

export function persistReadingSessionModalBookId(bookId: string | null): void {
  if (!canUseStorage()) return;
  try {
    if (bookId?.trim()) {
      localStorage.setItem(READING_SESSION_MODAL_BOOK_KEY, bookId);
    } else {
      localStorage.removeItem(READING_SESSION_MODAL_BOOK_KEY);
    }
  } catch {
    // Ignore.
  }
}
