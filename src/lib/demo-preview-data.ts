import { createClient } from "@supabase/supabase-js";
import {
  DEMO_PREVIEW_USER_ID,
  type DemoPreviewPayload,
} from "@/lib/demo-preview";
import {
  fetchBooks,
  fetchReadingSessions,
} from "@/lib/storage/supabase-db";
import {
  profileRowToUser,
  type ProfileRow,
} from "@/lib/storage/supabase-mappers";

/** Shared in-process cache so warm serverless instances skip Supabase. */
let serverCache: { payload: DemoPreviewPayload; savedAt: number } | null =
  null;
const SERVER_CACHE_TTL_MS = 60 * 60_000;

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Read-only demo profile — never inserts (anon cannot write). */
async function fetchDemoProfile(
  supabase: ReturnType<typeof createAnonClient>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,username,avatar_url,bio,reading_goal,monthly_reading_goal,streak_shields,last_shield_milestone,shielded_dates,last_shielded_date,shield_activated_on,shield_offer_dismissed_for,streak_style_id,updated_at",
    )
    .eq("id", DEMO_PREVIEW_USER_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Demo preview profile not found.");
  return profileRowToUser(data as ProfileRow);
}

/**
 * Load demo library on the server. Prefer in-process cache, then Supabase.
 * Used by /api/demo-preview so Vercel can CDN-cache the JSON response.
 */
export async function loadDemoPreviewPayload(): Promise<DemoPreviewPayload> {
  if (
    serverCache &&
    Date.now() - serverCache.savedAt < SERVER_CACHE_TTL_MS
  ) {
    return serverCache.payload;
  }

  const supabase = createAnonClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const [profile, books, sessions] = await Promise.all([
    fetchDemoProfile(supabase),
    fetchBooks(supabase, DEMO_PREVIEW_USER_ID, { readOnly: true }),
    fetchReadingSessions(supabase, DEMO_PREVIEW_USER_ID, {
      sinceIso: since.toISOString(),
    }),
  ]);

  const payload: DemoPreviewPayload = {
    profile,
    books,
    sessions,
    ownerLabel: profile.username?.trim() || "Chris",
  };

  serverCache = { payload, savedAt: Date.now() };
  return payload;
}
