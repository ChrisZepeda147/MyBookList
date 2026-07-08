"use client";

import { useEffect, useMemo, useState } from "react";
import { ReadingWrappedModal } from "@/components/ReadingWrappedModal";
import {
  computeWrappedStats,
  markWrappedSeen,
  shouldAutoShowWrapped,
  type WrappedPeriod,
} from "@/lib/reading-wrapped";
import { useAuth } from "@/providers/AuthProvider";
import { useBookStore } from "@/providers/BookStoreProvider";
import { useReadingSessionLog } from "@/providers/ReadingSessionLogProvider";

/** Auto-opens the 6-month wrapped recap on January 1 and July 1. */
export function ReadingWrappedOrchestrator() {
  const { user } = useAuth();
  const { books } = useBookStore();
  const { sessions, hydrated } = useReadingSessionLog();
  const [autoPeriod, setAutoPeriod] = useState<WrappedPeriod | null>(null);

  useEffect(() => {
    if (!user?.id || !hydrated) return;
    const period = shouldAutoShowWrapped(user.id);
    if (period) setAutoPeriod(period);
  }, [hydrated, user?.id]);

  const stats = useMemo(() => {
    if (!autoPeriod) return null;
    return computeWrappedStats(sessions, books, autoPeriod);
  }, [autoPeriod, books, sessions]);

  if (!autoPeriod || !stats || !user?.id) return null;

  function handleClose() {
    markWrappedSeen(user!.id, autoPeriod!.id);
    setAutoPeriod(null);
  }

  return (
    <ReadingWrappedModal
      period={autoPeriod}
      stats={stats}
      onClose={handleClose}
    />
  );
}
