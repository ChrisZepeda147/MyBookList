import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookEntry, ReadingSessionLogEntry, UserProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import { resolveBookCategoryTags } from "@/lib/categories";
import {
  bookEntryToInsert,
  bookRowToEntry,
  bookUpdatesToRow,
  profileRowToUser,
  readingSessionEntryToRow,
  readingSessionRowToEntry,
  userProfileToRow,
  type BookRow,
  type ProfileRow,
  type ReadingSessionRow,
} from "@/lib/storage/supabase-mappers";

export async function fetchServerNow(supabase: SupabaseClient): Promise<Date> {
  const { data, error } = await supabase.rpc("server_now");
  if (error) throw error;
  return new Date(data as string);
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const insert = userProfileToRow(userId, DEFAULT_PROFILE);
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(insert)
      .select("*")
      .single();
    if (insertError) throw insertError;
    return profileRowToUser(created as ProfileRow);
  }

  return profileRowToUser(data as ProfileRow);
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile,
): Promise<UserProfile> {
  const row = {
    ...userProfileToRow(userId, profile),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row)
    .select("*")
    .single();

  if (error) throw error;
  return profileRowToUser(data as ProfileRow);
}

export async function fetchBooks(
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

export async function insertBook(
  supabase: SupabaseClient,
  userId: string,
  book: Omit<BookEntry, "id" | "addedAt">,
): Promise<BookEntry> {
  const payload = bookEntryToInsert(userId, book);

  const { data, error } = await supabase
    .from("user_books")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return bookRowToEntry(data as BookRow);
}

export async function patchBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  updates: Partial<BookEntry>,
  existing?: BookEntry,
): Promise<BookEntry> {
  let rowUpdates = bookUpdatesToRow(updates);

  if (
    (updates.apiCategories !== undefined ||
      updates.categories !== undefined ||
      updates.description !== undefined) &&
    existing
  ) {
    const merged = { ...existing, ...updates };
    rowUpdates = {
      ...rowUpdates,
      api_categories: merged.apiCategories ?? [],
      categories: resolveBookCategoryTags(
        merged.apiCategories,
        merged.categories,
        merged.description,
        merged.title,
        merged.author,
      ),
      description: merged.description,
    };
  }

  const { data, error } = await supabase
    .from("user_books")
    .update(rowUpdates)
    .eq("id", bookId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return bookRowToEntry(data as BookRow);
}

export async function deleteBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchReadingSessions(
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

export async function upsertReadingSessions(
  supabase: SupabaseClient,
  userId: string,
  entries: ReadingSessionLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  const rows = entries.map((entry) => readingSessionEntryToRow(userId, entry));
  const { error } = await supabase.from("reading_sessions").upsert(rows);
  if (error) throw error;
}

export async function updateReadingSession(
  supabase: SupabaseClient,
  userId: string,
  entry: ReadingSessionLogEntry,
): Promise<ReadingSessionLogEntry> {
  const row = readingSessionEntryToRow(userId, entry);
  const { data, error } = await supabase
    .from("reading_sessions")
    .update({
      end_page: row.end_page,
      pages_read: row.pages_read,
      pages_per_hour: row.pages_per_hour,
    })
    .eq("id", entry.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return readingSessionRowToEntry(data as ReadingSessionRow);
}

export async function deleteReadingSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("reading_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) throw error;
}
