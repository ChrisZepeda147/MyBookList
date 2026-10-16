"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  hydrateReadingSessionLog,
  readReadingSessionLog,
} from "@/lib/reading-session-log";
import {
  loadDemoPreviewLibrary,
  peekDemoPreviewCache,
} from "@/lib/demo-preview";
import { dailyMinutesFromSessions } from "@/lib/daily-reading-stars";
import { readingDaysFromSessions } from "@/lib/reading-streak";
import type { ReadingSessionLogEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface ReadingSessionLogContextValue {
  sessions: ReadingSessionLogEntry[];
  readingDays: Set<string>;
  /** Total minutes read per local date key (YYYY-MM-DD). */
  dailyMinutes: Map<string, number>;
  hydrated: boolean;
  reload: () => void;
}

const ReadingSessionLogContext =
  createContext<ReadingSessionLogContextValue | null>(null);

export function ReadingSessionLogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authReady } = useAuth();
  const [sessions, setSessions] = useState<ReadingSessionLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedUserRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    if (!user?.id) return;
    setSessions(readReadingSessionLog(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!authReady) {
      setHydrated(false);
      return;
    }

    if (!user?.id) {
      let cancelled = false;
      hydratedUserRef.current = null;

      const cached = peekDemoPreviewCache();
      if (cached) {
        setSessions(cached.sessions);
        setHydrated(true);
        void loadDemoPreviewLibrary({ refresh: true }).then((demo) => {
          if (!cancelled) setSessions(demo.sessions);
        });
        return () => {
          cancelled = true;
        };
      }

      setHydrated(false);
      void loadDemoPreviewLibrary()
        .then((demo) => {
          if (!cancelled) {
            setSessions(demo.sessions);
            setHydrated(true);
          }
        })
        .catch((err) => {
          console.error("[ReadingSessionLog] Demo load failed:", err);
          if (!cancelled) {
            setSessions([]);
            setHydrated(true);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (hydratedUserRef.current === user.id) {
      return;
    }

    // Local cache first — UI can render streak immediately.
    const cached = readReadingSessionLog(user.id);
    setSessions(cached);
    setHydrated(true);

    let cancelled = false;

    void hydrateReadingSessionLog(user.id).then((entries) => {
      if (!cancelled) {
        setSessions(entries);
        hydratedUserRef.current = user.id;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    const handleUpdate = () => reload();
    window.addEventListener("reading-session-log-updated", handleUpdate);
    return () => {
      window.removeEventListener("reading-session-log-updated", handleUpdate);
    };
  }, [reload]);

  const readingDays = useMemo(
    () => readingDaysFromSessions(sessions),
    [sessions],
  );

  const dailyMinutes = useMemo(
    () => dailyMinutesFromSessions(sessions),
    [sessions],
  );

  const value = useMemo(
    () => ({ sessions, readingDays, dailyMinutes, hydrated, reload }),
    [sessions, readingDays, dailyMinutes, hydrated, reload],
  );

  return (
    <ReadingSessionLogContext.Provider value={value}>
      {children}
    </ReadingSessionLogContext.Provider>
  );
}

export function useReadingSessionLog() {
  const context = useContext(ReadingSessionLogContext);
  if (!context) {
    throw new Error(
      "useReadingSessionLog must be used within ReadingSessionLogProvider",
    );
  }
  return context;
}
