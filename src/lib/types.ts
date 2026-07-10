export type ReadingStatus =
  | "reading"
  | "completed"
  | "on_hold"
  | "dnf"
  | "plan_to_read";

export interface BookEntry {
  id: string;
  title: string;
  subtitle?: string | null;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  /** Last page reached while reading (progress marker). */
  currentPage?: number | null;
  /** When true, automatic backfill will not overwrite pageCount. */
  pageCountLocked?: boolean;
  /** Raw Google Books `volumeInfo.categories` — source of truth for tag parsing. */
  apiCategories?: string[];
  categories: string[];
  status: ReadingStatus;
  rating: number | null; // 0.0–5.0 in 0.1 steps; null when not rated
  dateCompleted: string | null;
  addedAt: string;
  googleBooksId?: string;
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  bio: string;
  readingGoal: number;
  monthlyReadingGoal: number;
  /** Streak Shields earned every 5 consecutive reading days. */
  streakShields: number;
  /** Highest 5-day milestone already rewarded (5, 10, 15…). */
  lastShieldMilestone: number;
  /** Calendar day (YYYY-MM-DD) bridged by a consumed shield. */
  lastShieldedDate: string | null;
  /** Calendar day when a shield was last activated (for UI). */
  shieldActivatedOn: string | null;
  /** Missed day the user declined to shield (suppresses re-prompt). */
  shieldOfferDismissedFor: string | null;
  /** Optional equipped streak style (unlocked at 30+ days). */
  streakStyleId: string | null;
}

export interface BookSearchResult {
  id: string;
  title: string;
  subtitle?: string | null;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  apiCategories?: string[];
  categories: string[];
  editionLabel?: string;
  publishedDate?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
}

export interface BookPrefill {
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  pageCount: number | null;
  googleBooksId?: string;
  apiCategories?: string[];
  categories: string[];
}

export interface AppData {
  profile: UserProfile;
  books: BookEntry[];
}

/** Logged when a reading session is saved (timed or manual). */
export interface ReadingSessionLogEntry {
  id: string;
  date: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  secondsRead: number;
  minutesRead: number;
  pagesPerHour: number;
  /** Server `created_at` when persisted (metadata only — streak/calendar use `date`). */
  createdAt?: string;
}

export const READING_STATUSES: {
  value: ReadingStatus;
  label: string;
}[] = [
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "dnf", label: "DNF" },
  { value: "plan_to_read", label: "Plan to Read" },
];

export const DEFAULT_PROFILE: UserProfile = {
  username: "Bookworm",
  avatarUrl: "",
  bio: "Tracking my reading journey one page at a time.",
  readingGoal: 24,
  monthlyReadingGoal: 2,
  streakShields: 0,
  lastShieldMilestone: 0,
  lastShieldedDate: null,
  shieldActivatedOn: null,
  shieldOfferDismissedFor: null,
  streakStyleId: null,
};

export type SortOption = "default" | "score" | "alphabetical" | "dateCompleted";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "score", label: "Sort by Score" },
  { value: "alphabetical", label: "Alphabetical (A–Z)" },
  { value: "dateCompleted", label: "Date Completed" },
];

export function statusLabel(status: ReadingStatus): string {
  return READING_STATUSES.find((s) => s.value === status)?.label ?? status;
}
