import type {
  BookEntry,
  ReadingSessionLogEntry,
  UserProfile,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchBooks,
  fetchProfile,
  fetchReadingSessions,
} from "@/lib/storage/supabase-db";

/** Guest preview mirrors this account — same data path as being signed in. */
export const DEMO_PREVIEW_EMAIL = "chriszepeda147@gmail.com";
/** Stable id so preview loads with the same queries as a normal login. */
export const DEMO_PREVIEW_USER_ID = "45176abe-8550-4f9c-87b3-0090a4f99ccf";

export interface DemoPreviewPayload {
  profile: UserProfile;
  books: BookEntry[];
  sessions: ReadingSessionLogEntry[];
  ownerLabel: string;
}

const CACHE_KEY = "mybooklist_demo_preview_v3";
/** Keep guest preview off the DB for a full day per browser. */
const CACHE_TTL_MS = 24 * 60 * 60_000;

let memoryCache: { payload: DemoPreviewPayload; savedAt: number } | null = null;
let inflight: Promise<DemoPreviewPayload> | null = null;

function readPersistentCache(): DemoPreviewPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      payload: DemoPreviewPayload;
      savedAt: number;
    };
    if (!parsed?.payload || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writePersistentCache(payload: DemoPreviewPayload) {
  memoryCache = { payload, savedAt: Date.now() };
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ payload, savedAt: Date.now() }),
    );
  } catch {
    // Ignore quota errors.
  }
}

async function fetchDemoLibrary(): Promise<DemoPreviewPayload> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // Sessions: only what streak/calendar need (~3 months), not the full history.
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const [profile, books, sessions] = await Promise.all([
    fetchProfile(supabase, DEMO_PREVIEW_USER_ID),
    fetchBooks(supabase, DEMO_PREVIEW_USER_ID, { readOnly: true }),
    fetchReadingSessions(supabase, DEMO_PREVIEW_USER_ID, {
      sinceIso: since.toISOString(),
    }),
  ]);

  return {
    profile,
    books,
    sessions,
    ownerLabel: profile.username?.trim() || "Chris",
  };
}

/**
 * Load the demo account the same way a signed-in user loads their library.
 * Dedupes concurrent callers and reuses a long browser cache to protect Disk IO.
 */
export function loadDemoPreviewLibrary(): Promise<DemoPreviewPayload> {
  if (memoryCache && Date.now() - memoryCache.savedAt < CACHE_TTL_MS) {
    return Promise.resolve(memoryCache.payload);
  }

  const cached = readPersistentCache();
  if (cached) {
    memoryCache = { payload: cached, savedAt: Date.now() };
    return Promise.resolve(cached);
  }

  if (inflight) return inflight;

  inflight = fetchDemoLibrary()
    .then((payload) => {
      writePersistentCache(payload);
      return payload;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
