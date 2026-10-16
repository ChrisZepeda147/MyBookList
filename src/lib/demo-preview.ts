import type {
  BookEntry,
  ReadingSessionLogEntry,
  UserProfile,
} from "@/lib/types";

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

const CACHE_KEY = "mybooklist_demo_preview_v4";
/** Keep guest preview off the network for a full day per browser. */
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

function isDemoPreviewPayload(value: unknown): value is DemoPreviewPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.books) &&
    Array.isArray(v.sessions) &&
    typeof v.profile === "object" &&
    v.profile !== null
  );
}

/** Fetch via Vercel-cached API — avoids browser → Supabase on every visit. */
async function fetchDemoLibrary(): Promise<DemoPreviewPayload> {
  const res = await fetch("/api/demo-preview", {
    // Match <link rel="preload" crossOrigin="anonymous"> so the preload is reused.
    credentials: "omit",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Demo preview API failed (${res.status}).`);
  }

  const data: unknown = await res.json();
  if (!isDemoPreviewPayload(data)) {
    throw new Error("Demo preview API returned an unexpected payload.");
  }
  return data;
}

/** Sync peek for instant first paint — no network. */
export function peekDemoPreviewCache(): DemoPreviewPayload | null {
  if (memoryCache && Date.now() - memoryCache.savedAt < CACHE_TTL_MS) {
    return memoryCache.payload;
  }
  const cached = readPersistentCache();
  if (cached) {
    memoryCache = { payload: cached, savedAt: Date.now() };
    return cached;
  }
  return null;
}

/**
 * Load the demo account for guest preview.
 * Dedupes concurrent callers; prefers localStorage, then CDN-cached API.
 * Pass `{ refresh: true }` to revalidate from the API (still CDN-friendly).
 */
export function loadDemoPreviewLibrary(options?: {
  refresh?: boolean;
}): Promise<DemoPreviewPayload> {
  if (!options?.refresh) {
    const cached = peekDemoPreviewCache();
    if (cached) return Promise.resolve(cached);
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
