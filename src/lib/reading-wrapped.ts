import type { BookEntry, ReadingSessionLogEntry } from "@/lib/types";

export type WrappedHalf = "H1" | "H2";

export interface WrappedPeriod {
  id: string;
  half: WrappedHalf;
  year: number;
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
}

export interface WrappedStats {
  totalMinutes: number;
  totalMinutesLabel: string;
  favoriteHour: number | null;
  favoriteHourLabel: string | null;
  topGenre: string | null;
  sessionCount: number;
}

const WRAPPED_SEEN_PREFIX = "reading_wrapped_seen_";

function periodBounds(year: number, half: WrappedHalf): { start: Date; end: Date } {
  if (half === "H1") {
    return {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 5, 30, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(year, 6, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export function buildWrappedPeriod(year: number, half: WrappedHalf): WrappedPeriod {
  const { start, end } = periodBounds(year, half);
  const label =
    half === "H1"
      ? `January – June ${year}`
      : `July – December ${year}`;
  const shortLabel = half === "H1" ? `Jan–Jun ${year}` : `Jul–Dec ${year}`;

  return {
    id: `${year}-${half}`,
    half,
    year,
    label,
    shortLabel,
    start,
    end,
  };
}

/** Most recently finished 6-month window (H1 after Jul 1; H2 after Jan 1). */
export function getMostRecentCompletedHalf(now = new Date()): WrappedPeriod {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 6) {
    return buildWrappedPeriod(year, "H1");
  }
  return buildWrappedPeriod(year - 1, "H2");
}

/** Period revealed automatically on January 1 and July 1. */
export function getAutoRevealPeriod(now = new Date()): WrappedPeriod | null {
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month === 0) return buildWrappedPeriod(year - 1, "H2");
  if (month === 6) return buildWrappedPeriod(year, "H1");
  return null;
}

function wrappedSeenKey(userId: string, periodId: string): string {
  return `${WRAPPED_SEEN_PREFIX}${userId}_${periodId}`;
}

export function hasSeenWrapped(userId: string, periodId: string): boolean {
  if (typeof window === "undefined" || !userId) return true;
  try {
    return localStorage.getItem(wrappedSeenKey(userId, periodId)) === "1";
  } catch {
    return true;
  }
}

export function markWrappedSeen(userId: string, periodId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(wrappedSeenKey(userId, periodId), "1");
  } catch {
    // Ignore quota errors.
  }
}

export function shouldAutoShowWrapped(userId: string, now = new Date()): WrappedPeriod | null {
  const period = getAutoRevealPeriod(now);
  if (!period || !userId) return null;
  if (hasSeenWrapped(userId, period.id)) return null;
  return period;
}

function sessionTimestamp(session: ReadingSessionLogEntry): number {
  return new Date(session.date).getTime();
}

function sessionInPeriod(
  session: ReadingSessionLogEntry,
  period: WrappedPeriod,
): boolean {
  const ts = sessionTimestamp(session);
  return ts >= period.start.getTime() && ts <= period.end.getTime();
}

function genreTagsFromBook(book: BookEntry | undefined): string[] {
  if (!book) return [];
  return book.categories.filter(
    (tag) => tag !== "Fiction" && tag !== "Non-Fiction",
  );
}

export function formatWrappedMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  if (rounded <= 0) return "0 min";
  if (rounded < 60) return `${rounded.toLocaleString()} min`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (mins === 0) return `${hours.toLocaleString()} hr`;
  return `${hours.toLocaleString()} hr ${mins} min`;
}

export function formatFavoriteReadingHour(hour: number): string {
  const sample = new Date();
  sample.setHours(hour, 0, 0, 0);
  const formatted = sample.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Favorite time to read: ${formatted}`;
}

export function computeWrappedStats(
  sessions: ReadingSessionLogEntry[],
  books: BookEntry[],
  period: WrappedPeriod,
): WrappedStats {
  const booksById = new Map(books.map((book) => [book.id, book]));
  const periodSessions = sessions.filter((session) =>
    sessionInPeriod(session, period),
  );

  let totalSeconds = 0;
  const hourCounts = new Map<number, number>();
  const genreCounts = new Map<string, number>();

  for (const session of periodSessions) {
    totalSeconds += session.secondsRead;
    const hour = new Date(session.date).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    for (const genre of genreTagsFromBook(booksById.get(session.bookId))) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const totalMinutes = Math.round(totalSeconds / 60);

  let favoriteHour: number | null = null;
  let bestHourCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > bestHourCount) {
      bestHourCount = count;
      favoriteHour = hour;
    }
  }

  let topGenre: string | null = null;
  let bestGenreCount = 0;
  for (const [genre, count] of genreCounts) {
    if (count > bestGenreCount) {
      bestGenreCount = count;
      topGenre = genre;
    }
  }

  return {
    totalMinutes,
    totalMinutesLabel: formatWrappedMinutes(totalMinutes),
    favoriteHour,
    favoriteHourLabel:
      favoriteHour !== null ? formatFavoriteReadingHour(favoriteHour) : null,
    topGenre,
    sessionCount: periodSessions.length,
  };
}
