"use client";

import { ReadingStreakDisplay } from "@/components/ReadingStreakDisplay";
import { useReadingStreak } from "@/hooks/useReadingStreak";

export function ReadingStreakBanner() {
  const { streak } = useReadingStreak();
  return <ReadingStreakDisplay streak={streak} />;
}
