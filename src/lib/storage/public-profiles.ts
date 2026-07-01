import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookEntry } from "@/lib/types";
import { bookRowToEntry, type BookRow } from "@/lib/storage/supabase-mappers";
import { normalizeAvatarUrl } from "@/lib/storage/avatar-url";

export interface PublicProfileSummary {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string;
  bio: string;
}

interface PublicProfileRow {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string;
  bio: string;
}

function rowToPublicProfile(row: PublicProfileRow): PublicProfileSummary {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: normalizeAvatarUrl(row.avatar_url),
    bio: row.bio,
  };
}

/** List other users' public profiles (excludes the signed-in user). */
export async function fetchBrowsableProfiles(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<PublicProfileSummary[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url, bio")
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

export function publicProfileLabel(profile: PublicProfileSummary): string {
  return profile.email?.trim() || profile.username;
}

export function filterBrowsableProfiles(
  profiles: PublicProfileSummary[],
  query: string,
): PublicProfileSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return profiles;

  return profiles.filter((profile) => {
    const email = profile.email?.toLowerCase() ?? "";
    const username = profile.username.toLowerCase();
    return email.includes(q) || username.includes(q);
  });
}
