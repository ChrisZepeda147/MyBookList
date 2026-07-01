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
import { readingDaysFromSessions } from "@/lib/reading-streak";
import type { ReadingSessionLogEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface ReadingSessionLogContextValue {
  sessions: ReadingSessionLogEntry[];
  readingDays: Set<string>;
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
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ReadingSessionLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedUserRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    if (!user?.id) {
      setSessions([]);
      return;
    }
    setSessions(readReadingSessionLog(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setSessions([]);
      setHydrated(true);
      hydratedUserRef.current = null;
      return;
    }

    if (hydratedUserRef.current === user.id) {
      return;
    }

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
  }, [user?.id]);

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

  const value = useMemo(
    () => ({ sessions, readingDays, hydrated, reload }),
    [sessions, readingDays, hydrated, reload],
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
