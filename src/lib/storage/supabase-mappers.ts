import type { BookEntry, ReadingSessionLogEntry, ReadingStatus, UserProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import { normalizeAvatarUrl } from "@/lib/storage/avatar-url";
import { ensureBookDescription, descriptionForStorage, hasRealDescription, isPlaceholderDescription, cleanDescription } from "@/lib/book-descriptions";
import {
  looksLikeRawApiCategories,
  resolveBookCategoryTags,
} from "@/lib/categories";

export interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  reading_goal: number;
  monthly_reading_goal: number;
  streak_shields?: number;
  last_shield_milestone?: number;
  last_shielded_date?: string | null;
  shield_activated_on?: string | null;
  shield_offer_dismissed_for?: string | null;
  streak_style_id?: string | null;
  updated_at: string;
}

export interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  page_count: number | null;
  page_count_locked: boolean;
  current_page: number | null;
  api_categories: string[];
  categories: string[];
  status: ReadingStatus;
  rating: number | null;
  date_completed: string | null;
  added_at: string;
  google_books_id: string | null;
}

export function profileRowToUser(row: ProfileRow | null): UserProfile {
  if (!row) return { ...DEFAULT_PROFILE };
  return {
    username: row.username,
    avatarUrl: normalizeAvatarUrl(row.avatar_url),
    bio: row.bio ?? DEFAULT_PROFILE.bio,
    readingGoal: row.reading_goal ?? DEFAULT_PROFILE.readingGoal,
    monthlyReadingGoal:
      row.monthly_reading_goal ?? DEFAULT_PROFILE.monthlyReadingGoal,
    streakShields: row.streak_shields ?? DEFAULT_PROFILE.streakShields,
    lastShieldMilestone:
      row.last_shield_milestone ?? DEFAULT_PROFILE.lastShieldMilestone,
    lastShieldedDate: row.last_shielded_date ?? null,
    shieldActivatedOn: row.shield_activated_on ?? null,
    shieldOfferDismissedFor: row.shield_offer_dismissed_for ?? null,
    streakStyleId: row.streak_style_id ?? null,
  };
}

export function userProfileToRow(
  userId: string,
  profile: UserProfile,
): Omit<ProfileRow, "updated_at"> {
  return {
    id: userId,
    username: profile.username,
    avatar_url: normalizeAvatarUrl(profile.avatarUrl),
    bio: profile.bio,
    reading_goal: profile.readingGoal,
    monthly_reading_goal: profile.monthlyReadingGoal,
    streak_shields: profile.streakShields,
    last_shield_milestone: profile.lastShieldMilestone,
    last_shielded_date: profile.lastShieldedDate,
    shield_activated_on: profile.shieldActivatedOn,
    shield_offer_dismissed_for: profile.shieldOfferDismissedFor,
    streak_style_id: profile.streakStyleId,
  };
}

export function bookRowToEntry(row: BookRow): BookEntry {
  let apiCategories = row.api_categories ?? [];
  if (!apiCategories.length && looksLikeRawApiCategories(row.categories ?? [])) {
    apiCategories = row.categories;
  }

  const description = hasRealDescription(row.description)
    ? cleanDescription(row.description)
    : null;
  const descriptionForTags = ensureBookDescription(description);

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    description,
    pageCount: row.page_count,
    pageCountLocked: row.page_count_locked ?? false,
    currentPage: row.current_page ?? null,
    apiCategories,
    categories: resolveBookCategoryTags(
      apiCategories,
      row.categories ?? [],
      descriptionForTags,
      row.title,
      row.author,
    ),
    status: row.status,
    rating: row.rating,
    dateCompleted: row.date_completed,
    addedAt: row.added_at,
    googleBooksId: row.google_books_id ?? undefined,
  };
}

export function bookEntryToInsert(
  userId: string,
  book: Omit<BookEntry, "id" | "addedAt">,
): Omit<BookRow, "id" | "added_at"> {
  const description = ensureBookDescription(book.description);
  const categories = resolveBookCategoryTags(
    book.apiCategories,
    book.categories,
    description,
    book.title,
    book.author,
  );

  return {
    user_id: userId,
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl,
    description: descriptionForStorage(book.description),
    page_count: book.pageCount,
    page_count_locked: book.pageCountLocked ?? false,
    current_page: book.currentPage ?? null,
    api_categories: book.apiCategories ?? [],
    categories,
    status: book.status,
    rating: book.rating,
    date_completed: book.dateCompleted,
    google_books_id: book.googleBooksId ?? null,
  };
}

export function bookUpdatesToRow(
  updates: Partial<BookEntry>,
): Partial<BookRow> {
  const row: Partial<BookRow> = {};

  if (updates.title !== undefined) row.title = updates.title;
  if (updates.author !== undefined) row.author = updates.author;
  if (updates.coverUrl !== undefined) row.cover_url = updates.coverUrl;
  if (updates.description !== undefined) {
    row.description = descriptionForStorage(updates.description);
  }
  if (updates.pageCount !== undefined) row.page_count = updates.pageCount;
  if (updates.pageCountLocked !== undefined) {
    row.page_count_locked = updates.pageCountLocked;
  }
  if (updates.currentPage !== undefined) {
    row.current_page = updates.currentPage;
  }
  if (updates.apiCategories !== undefined) {
    row.api_categories = updates.apiCategories;
  }
  if (updates.categories !== undefined) row.categories = updates.categories;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.dateCompleted !== undefined) {
    row.date_completed = updates.dateCompleted;
  }
  if (updates.googleBooksId !== undefined) {
    row.google_books_id = updates.googleBooksId ?? null;
  }

  return row;
}

export interface ReadingSessionRow {
  id: string;
  user_id: string;
  book_id: string | null;
  book_title: string;
  book_author: string;
  start_page: number;
  end_page: number;
  pages_read: number;
  seconds_read: number;
  minutes_read: number;
  pages_per_hour: number;
  session_date: string;
  created_at: string;
}

export function readingSessionRowToEntry(
  row: ReadingSessionRow,
): ReadingSessionLogEntry {
  return {
    id: row.id,
    date: row.session_date,
    bookId: row.book_id ?? "",
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    startPage: row.start_page,
    endPage: row.end_page,
    pagesRead: row.pages_read,
    secondsRead: row.seconds_read,
    minutesRead: Number(row.minutes_read),
    pagesPerHour: Number(row.pages_per_hour),
    createdAt: row.created_at,
  };
}

export function readingSessionEntryToRow(
  userId: string,
  entry: ReadingSessionLogEntry,
): Omit<ReadingSessionRow, "created_at"> {
  return {
    id: entry.id,
    user_id: userId,
    book_id: entry.bookId || null,
    book_title: entry.bookTitle,
    book_author: entry.bookAuthor,
    start_page: entry.startPage,
    end_page: entry.endPage,
    pages_read: entry.pagesRead,
    seconds_read: entry.secondsRead,
    minutes_read: entry.minutesRead,
    pages_per_hour: entry.pagesPerHour,
    session_date: entry.date,
  };
}
