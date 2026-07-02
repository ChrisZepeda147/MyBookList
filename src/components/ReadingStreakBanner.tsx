"use client";

import { useReadingStreak } from "@/hooks/useReadingStreak";
import { StreakDayCards } from "@/components/StreakDayCards";
import { StreakFireIcon } from "@/components/StreakFireIcon";

export function ReadingStreakBanner() {
  const { streak } = useReadingStreak();

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-700/60 px-5 py-4 sm:px-6">
        <StreakFireIcon streak={streak} />
        <h2 className="font-reading text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
          Streak
        </h2>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <StreakDayCards streak={streak} />

        {streak === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Finish a timed reading session to start your streak.
          </p>
        )}
      </div>
    </section>
  );
}
