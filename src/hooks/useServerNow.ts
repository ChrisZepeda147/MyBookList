"use client";

import { useEffect, useState } from "react";
import { getServerNow } from "@/lib/storage/server-time";
import { createClient } from "@/lib/supabase/client";

const REFRESH_MS = 30 * 60_000;

/**
 * Authoritative "now" for streak evaluation — prefers Supabase server time
 * over the device clock so skewed phones don't break streaks.
 */
export function useServerNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setNow(new Date());
        return;
      }

      try {
        const serverNow = await getServerNow(supabase);
        if (!cancelled) setNow(serverNow);
      } catch {
        if (!cancelled) setNow(new Date());
      }
    }

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return now;
}
