import type { BookEntry, UserProfile } from "@/lib/types";

const CACHE_PREFIX = "mybooklist_library_v1_";
/** Keep signed-in library paint instant across visits; refresh in background. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60_000;

export interface LibraryCachePayload {
  profile: UserProfile;
  books: BookEntry[];
}

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

export function peekLibraryCache(userId: string): LibraryCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      payload: LibraryCachePayload;
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

export function writeLibraryCache(
  userId: string,
  payload: LibraryCachePayload,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ payload, savedAt: Date.now() }),
    );
  } catch {
    // Ignore quota errors.
  }
}
