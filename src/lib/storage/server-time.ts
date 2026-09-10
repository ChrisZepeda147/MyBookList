import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchServerNow } from "@/lib/storage/supabase-db";

const CACHE_TTL_MS = 10 * 60_000;

let cached:
  | {
      serverMs: number;
      clientMs: number;
      fetchedAt: number;
    }
  | null = null;

/** Server clock with short client-side interpolation between fetches. */
export async function getServerNow(supabase: SupabaseClient): Promise<Date> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    const elapsed = now - cached.clientMs;
    return new Date(cached.serverMs + elapsed);
  }

  const serverDate = await fetchServerNow(supabase);
  cached = {
    serverMs: serverDate.getTime(),
    clientMs: now,
    fetchedAt: now,
  };
  return serverDate;
}

export function clearServerTimeCache(): void {
  cached = null;
}
