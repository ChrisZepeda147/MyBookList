import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookEntry, ReadingSessionLogEntry } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import {
  bookRowToEntry,
  readingSessionRowToEntry,
  type BookRow,
  type ReadingSessionRow,
} from "@/lib/storage/supabase-mappers";
import { normalizeAvatarUrl } from "@/lib/storage/avatar-url";
import {
  evaluateReadingStreak,
  type StreakShieldConfig,
} from "@/lib/reading-streak";

export interface PublicProfileSummary {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string;
  bio: string;
  readingGoal: number;
  monthlyReadingGoal: number;
  streakShields: number;
  lastShieldMilestone: number;
  lastShieldedDate: string | null;
  shieldActivatedOn: string | null;
  shieldOfferDismissedFor: string | null;
}

interface PublicProfileRow {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string;
  bio: string;
  reading_goal: number | null;
  monthly_reading_goal: number | null;
  streak_shields: number | null;
  last_shield_milestone: number | null;
  last_shielded_date: string | null;
  shield_activated_on: string | null;
  shield_offer_dismissed_for: string | null;
}

function rowToPublicProfile(row: PublicProfileRow): PublicProfileSummary {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: normalizeAvatarUrl(row.avatar_url),
    bio: row.bio?.trim() || DEFAULT_PROFILE.bio,
    readingGoal: row.reading_goal ?? DEFAULT_PROFILE.readingGoal,
    monthlyReadingGoal:
      row.monthly_reading_goal ?? DEFAULT_PROFILE.monthlyReadingGoal,
    streakShields: row.streak_shields ?? DEFAULT_PROFILE.streakShields,
    lastShieldMilestone:
      row.last_shield_milestone ?? DEFAULT_PROFILE.lastShieldMilestone,
    lastShieldedDate: row.last_shielded_date ?? null,
    shieldActivatedOn: row.shield_activated_on ?? null,
    shieldOfferDismissedFor: row.shield_offer_dismissed_for ?? null,
  };
}

export function publicProfileStreakConfig(
  profile: PublicProfileSummary,
): StreakShieldConfig {
  return {
    streakShields: profile.streakShields,
    lastShieldMilestone: profile.lastShieldMilestone,
    lastShieldedDate: profile.lastShieldedDate,
    shieldActivatedOn: profile.shieldActivatedOn,
    shieldOfferDismissedFor: profile.shieldOfferDismissedFor,
  };
}

export function computePublicProfileStreak(
  sessions: ReadingSessionLogEntry[],
  profile: PublicProfileSummary,
  now = new Date(),
): number {
  return evaluateReadingStreak(
    sessions,
    publicProfileStreakConfig(profile),
    now,
  ).streak;
}

function firstNameOf(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function emailLocalPart(email: string | null): string {
  if (!email) return "";
  return email.split("@")[0]?.toLowerCase() ?? "";
}

/** List other users' public profiles (excludes the signed-in user). */
export async function fetchBrowsableProfiles(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<PublicProfileSummary[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, email, avatar_url, bio, reading_goal, monthly_reading_goal, streak_shields, last_shield_milestone, last_shielded_date, shield_activated_on, shield_offer_dismissed_for",
    )
    .neq("id", currentUserId)
    .order("username", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[]).map(rowToPublicProfile);
}

/** Read-only fetch of another user's book list. */
export async function fetchUserBooksForBrowse(
  supabase: SupabaseClient,
  userId: string,
): Promise<BookEntry[]> {
  const { data, error } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as BookRow[]).map(bookRowToEntry);
}

/** Read-only fetch of another user's reading sessions (for streak display). */
export async function fetchUserReadingSessionsForBrowse(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReadingSessionLogEntry[]> {
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("session_date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ReadingSessionRow[]).map(readingSessionRowToEntry);
}

export function publicProfileLabel(profile: PublicProfileSummary): string {
  return profile.email?.trim() || profile.username;
}

/**
 * Match by email, display name, or first name (first token of username / email local).
 * Returns nothing until the user enters a search query.
 */
export function filterBrowsableProfiles(
  profiles: PublicProfileSummary[],
  query: string,
): PublicProfileSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return profiles.filter((profile) => {
    const username = profile.username.toLowerCase();
    const email = profile.email?.toLowerCase() ?? "";
    const firstName = firstNameOf(profile.username).toLowerCase();
    const emailLocal = emailLocalPart(profile.email);

    return (
      email.includes(q) ||
      username.includes(q) ||
      firstName.startsWith(q) ||
      firstName.includes(q) ||
      emailLocal.startsWith(q) ||
      emailLocal.includes(q)
    );
  });
}
