import type { ReadingSessionLogEntry } from "@/lib/types";
import {
  deleteReadingSession,
  fetchReadingSessions,
  updateReadingSession,
  upsertReadingSessions,
} from "@/lib/storage/supabase-db";
import { createClient } from "@/lib/supabase/client";

const LOG_KEY_PREFIX = "reading_session_log_";

function logKey(userId: string): string {
  return `${LOG_KEY_PREFIX}${userId}`;
}

function sortSessionsNewestFirst(
  entries: ReadingSessionLogEntry[],
): ReadingSessionLogEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function calculatePagesPerHour(
  pagesRead: number,
  secondsRead: number,
): number {
  if (pagesRead <= 0 || secondsRead <= 0) return 0;
  const hours = secondsRead / 3600;
  return Math.round((pagesRead / hours) * 10) / 10;
}

/** Weighted average pages/hr from timed sessions (excludes manual/unlogged time). */
export function averagePagesPerHourFromSessions(
  sessions: ReadingSessionLogEntry[],
): number | null {
  let totalPages = 0;
  let totalSeconds = 0;

  for (const session of sessions) {
    if (session.secondsRead > 0 && session.pagesRead > 0) {
      totalPages += session.pagesRead;
      totalSeconds += session.secondsRead;
    }
  }

  if (totalSeconds <= 0) return null;

  return calculatePagesPerHour(totalPages, totalSeconds);
}

type LegacyReadingSessionLogEntry = ReadingSessionLogEntry & {
  pagesPerMinute?: number;
};

function migrateLogEntry(entry: LegacyReadingSessionLogEntry): ReadingSessionLogEntry {
  if (typeof entry.pagesPerHour === "number") {
    return entry;
  }

  const pagesPerHour =
    typeof entry.pagesPerMinute === "number" && entry.pagesPerMinute > 0
      ? Math.round(entry.pagesPerMinute * 60 * 10) / 10
      : calculatePagesPerHour(entry.pagesRead, entry.secondsRead);

  const { pagesPerMinute: _legacy, ...rest } = entry;
  return { ...rest, pagesPerHour };
}

export function readReadingSessionLog(userId: string): ReadingSessionLogEntry[] {
  if (typeof window === "undefined" || !userId) return [];

  try {
    const raw = localStorage.getItem(logKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyReadingSessionLogEntry[];
    if (!Array.isArray(parsed)) return [];
    return sortSessionsNewestFirst(parsed.map(migrateLogEntry));
  } catch {
    return [];
  }
}

function writeReadingSessionLog(
  userId: string,
  entries: ReadingSessionLogEntry[],
): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    localStorage.setItem(logKey(userId), JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("reading-session-log-updated"));
  } catch {
    // Ignore quota errors.
  }
}

function persistLocal(userId: string, entries: ReadingSessionLogEntry[]): void {
  writeReadingSessionLog(userId, sortSessionsNewestFirst(entries));
}

async function syncEntryToRemote(
  userId: string,
  entry: ReadingSessionLogEntry,
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  try {
    await upsertReadingSessions(supabase, userId, [entry]);
    const { data, error } = await supabase
      .from("reading_sessions")
      .select("id, created_at")
      .eq("id", entry.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.created_at) return;

    const next = readReadingSessionLog(userId).map((row) =>
      row.id === entry.id ? { ...row, createdAt: data.created_at } : row,
    );
    persistLocal(userId, next);
  } catch (err) {
    console.error("[reading-session-log] Failed to sync session:", err);
  }
}

async function syncDeleteToRemote(
  userId: string,
  sessionId: string,
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  try {
    await deleteReadingSession(supabase, userId, sessionId);
  } catch (err) {
    console.error("[reading-session-log] Failed to delete session:", err);
  }
}

async function syncUpdateToRemote(
  userId: string,
  entry: ReadingSessionLogEntry,
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  try {
    await updateReadingSession(supabase, userId, entry);
  } catch (err) {
    console.error("[reading-session-log] Failed to update session:", err);
  }
}

/**
 * Load sessions from Supabase, upload any browser-only entries, and refresh cache.
 * Books/profile already live in Supabase — reading sessions must too or they vanish
 * when localStorage is cleared or the browser changes.
 */
export async function hydrateReadingSessionLog(
  userId: string,
): Promise<ReadingSessionLogEntry[]> {
  if (!userId) return [];

  const local = readReadingSessionLog(userId);
  const supabase = createClient();

  if (!supabase) {
    return local;
  }

  try {
    const remote = await fetchReadingSessions(supabase, userId);
    const remoteIds = new Set(remote.map((entry) => entry.id));
    const localOnly = local.filter((entry) => !remoteIds.has(entry.id));

    if (localOnly.length > 0) {
      await upsertReadingSessions(supabase, userId, localOnly);
    }

    const merged = sortSessionsNewestFirst([...remote, ...localOnly]);
    persistLocal(userId, merged);
    return merged;
  } catch (err) {
    console.error("[reading-session-log] Failed to hydrate from Supabase:", err);
    return local;
  }
}

export function deleteReadingSessionLog(
  userId: string,
  sessionId: string,
): void {
  const next = readReadingSessionLog(userId).filter(
    (entry) => entry.id !== sessionId,
  );
  persistLocal(userId, next);
  void syncDeleteToRemote(userId, sessionId);
}

export function updateReadingSessionLogPages(
  userId: string,
  sessionId: string,
  endPage: number,
): ReadingSessionLogEntry | null {
  if (!Number.isFinite(endPage)) return null;

  const roundedEnd = Math.max(1, Math.round(endPage));
  let updated: ReadingSessionLogEntry | null = null;

  const next = readReadingSessionLog(userId).map((entry) => {
    if (entry.id !== sessionId) return entry;

    const startPage = entry.startPage;
    const safeEnd = Math.max(roundedEnd, startPage);
    const pagesRead = Math.max(0, safeEnd - startPage);

    updated = {
      ...entry,
      endPage: safeEnd,
      pagesRead,
      pagesPerHour: calculatePagesPerHour(pagesRead, entry.secondsRead),
    };
    return updated;
  });

  if (!updated) return null;

  persistLocal(userId, next);
  void syncUpdateToRemote(userId, updated);
  return updated;
}

export function appendReadingSessionLog(
  userId: string,
  entry: Omit<ReadingSessionLogEntry, "id">,
): ReadingSessionLogEntry {
  const record: ReadingSessionLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
  };

  if (typeof window === "undefined" || !userId) return record;

  try {
    const existing = readReadingSessionLog(userId);
    persistLocal(userId, [record, ...existing]);
    void syncEntryToRemote(userId, record);
    window.dispatchEvent(new CustomEvent("reading-session-saved"));
  } catch {
    // Ignore quota errors.
  }

  return record;
}

export function buildSessionLogEntry(input: {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  startPage: number;
  endPage: number;
  elapsedMs: number;
}): Omit<ReadingSessionLogEntry, "id"> {
  const pagesRead = Math.max(0, input.endPage - input.startPage);
  const secondsRead = Math.max(0, Math.floor(input.elapsedMs / 1000));
  const minutesRead = Math.round((secondsRead / 60) * 100) / 100;
  const pagesPerHour = calculatePagesPerHour(pagesRead, secondsRead);

  return {
    date: new Date().toISOString(),
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    bookAuthor: input.bookAuthor,
    startPage: input.startPage,
    endPage: input.endPage,
    pagesRead,
    secondsRead,
    minutesRead,
    pagesPerHour,
  };
}
