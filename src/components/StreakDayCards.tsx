"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getDefaultStreakWindowStart,
  getStreakDayCardState,
  getStreakStyle,
  getStreakWindowDays,
  shiftStreakWindowStart,
  streakRankLabel,
} from "@/lib/reading-streak";
import { StreakStyleCard } from "@/components/StreakStyleCard";

interface StreakDayCardsProps {
  streak: number;
}

export function StreakDayCards({ streak }: StreakDayCardsProps) {
  const [windowStart, setWindowStart] = useState(() =>
    getDefaultStreakWindowStart(streak),
  );

  useEffect(() => {
    setWindowStart(getDefaultStreakWindowStart(streak));
  }, [streak]);

  const visibleDays = getStreakWindowDays(windowStart);
  const rankLabel = streakRankLabel(streak);
  const activeStyle = getStreakStyle(streak);

  function goToPreviousPage() {
    setWindowStart((start) => shiftStreakWindowStart(start, -1));
  }

  function goToNextPage() {
    setWindowStart((start) => shiftStreakWindowStart(start, 1));
  }

  const rankLabelClass =
    activeStyle.id === "aurora"
      ? "streak-rank-label-aurora"
      : activeStyle.id === "ember"
        ? "streak-rank-label-ember"
        : activeStyle.kind === "gradient" || activeStyle.kind === "legendary"
          ? "streak-rank-label-premium"
          : "text-slate-400";

  return (
    <div className="space-y-4">
      <div>
        <p className="streak-count-text text-sm">
          {streak} day streak
        </p>
        {streak > 0 && (
          <p
            className={`mt-1 text-xs font-semibold uppercase tracking-wide ${rankLabelClass}`}
            style={
              activeStyle.kind === "solid"
                ? { color: activeStyle.fire }
                : undefined
            }
          >
            {rankLabel}
          </p>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={windowStart === 0}
          className="sticky left-0 z-10 shrink-0 rounded-md bg-slate-900 p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
          aria-label="View previous 7-day block"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 gap-1 sm:gap-2">
          {visibleDays.map((dayIndex) => (
            <StreakStyleCard
              key={dayIndex}
              dayIndex={dayIndex}
              state={getStreakDayCardState(dayIndex, streak)}
              activeTierDay={streak}
              headerVariant
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNextPage}
          className="sticky right-0 z-10 shrink-0 rounded-md bg-slate-900 p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
          aria-label="View next 7-day block"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
