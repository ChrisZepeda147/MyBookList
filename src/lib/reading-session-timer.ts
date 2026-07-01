export type ReadingSessionStatus = "idle" | "running" | "paused";

export interface ReadingSessionState {
  bookId: string;
  accumulatedMs: number;
  /** Wall-clock ms when the current running segment began; null while paused. */
  segmentStartedAt: number | null;
  status: ReadingSessionStatus;
  /** Page marker when this session began. */
  startPage: number;
}

const STORAGE_PREFIX = "reading_session_";

function storageKey(bookId: string): string {
  return `${STORAGE_PREFIX}${bookId}`;
}

export function readReadingSession(bookId: string): ReadingSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey(bookId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ReadingSessionState;
    if (parsed.bookId !== bookId) return null;
    if (
      typeof parsed.accumulatedMs !== "number" ||
      (parsed.segmentStartedAt !== null &&
        typeof parsed.segmentStartedAt !== "number") ||
      !["idle", "running", "paused"].includes(parsed.status)
    ) {
      return null;
    }

    return {
      ...parsed,
      startPage:
        typeof parsed.startPage === "number" && parsed.startPage > 0
          ? Math.round(parsed.startPage)
          : 1,
    };
  } catch {
    return null;
  }
}

export function writeReadingSession(state: ReadingSessionState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(storageKey(state.bookId), JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearReadingSession(bookId: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(storageKey(bookId));
  } catch {
    // Ignore.
  }
}

/** Elapsed ms from accumulated segments plus any active running segment. */
export function computeElapsedMs(
  state: Pick<
    ReadingSessionState,
    "accumulatedMs" | "segmentStartedAt" | "status"
  >,
  now = Date.now(),
): number {
  if (state.status === "running" && state.segmentStartedAt != null) {
    return (
      state.accumulatedMs + Math.max(0, now - state.segmentStartedAt)
    );
  }
  return Math.max(0, state.accumulatedMs);
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function createIdleSession(
  bookId: string,
  startPage = 1,
): ReadingSessionState {
  const state: ReadingSessionState = {
    bookId,
    accumulatedMs: 0,
    segmentStartedAt: null,
    status: "idle",
    startPage: Math.max(1, Math.round(startPage)),
  };
  return state;
}

/** Book progress → session start page (never below 1). */
export function resolveReadingStartPage(
  currentPage?: number | null,
): number {
  if (currentPage == null || !Number.isFinite(currentPage)) return 1;
  return Math.max(1, Math.round(currentPage));
}

/**
 * Load timer state from storage, applying saved book progress for new/idle sessions.
 * Running or paused sessions keep their original startPage.
 */
export function hydrateReadingSession(
  bookId: string,
  bookProgressPage: number,
): ReadingSessionState {
  const progressPage = resolveReadingStartPage(bookProgressPage);
  const stored = readReadingSession(bookId);

  if (!stored) {
    return createIdleSession(bookId, progressPage);
  }

  if (stored.status === "running" || stored.status === "paused") {
    return stored;
  }

  if (stored.status === "idle") {
    return createIdleSession(
      bookId,
      Math.max(stored.startPage, progressPage),
    );
  }

  return createIdleSession(bookId, progressPage);
}

/** Update start page on an idle session when book progress changes. */
export function syncIdleSessionStartPage(
  state: ReadingSessionState,
  bookProgressPage: number,
): ReadingSessionState {
  if (state.status !== "idle") return state;

  const progressPage = resolveReadingStartPage(bookProgressPage);
  if (state.startPage === progressPage) return state;

  return { ...state, startPage: progressPage };
}

export function startSession(
  bookId: string,
  startPage = 1,
): ReadingSessionState {
  const state: ReadingSessionState = {
    bookId,
    accumulatedMs: 0,
    segmentStartedAt: Date.now(),
    status: "running",
    startPage: Math.max(1, Math.round(startPage)),
  };
  writeReadingSession(state);
  return state;
}

export function pauseSession(state: ReadingSessionState): ReadingSessionState {
  const now = Date.now();
  const next: ReadingSessionState = {
    ...state,
    accumulatedMs:
      state.status === "running" && state.segmentStartedAt != null
        ? state.accumulatedMs + Math.max(0, now - state.segmentStartedAt)
        : state.accumulatedMs,
    segmentStartedAt: null,
    status: "paused",
  };
  writeReadingSession(next);
  return next;
}

export function resumeSession(state: ReadingSessionState): ReadingSessionState {
  const next: ReadingSessionState = {
    ...state,
    segmentStartedAt: Date.now(),
    status: "running",
  };
  writeReadingSession(next);
  return next;
}

export function restartSession(
  bookId: string,
  startPage = 1,
): ReadingSessionState {
  clearReadingSession(bookId);
  return startSession(bookId, startPage);
}

export function stopSession(state: ReadingSessionState): number {
  const elapsedMs = computeElapsedMs(state);
  clearReadingSession(state.bookId);
  return elapsedMs;
}
