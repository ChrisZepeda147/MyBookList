"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import {
  starTierForDay,
  type DailyStarTier,
} from "@/lib/daily-reading-stars";
import {
  countReadingDaysInMonth,
  getMonthCalendarCells,
  isSameMonth,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/reading-calendar";

function CalendarDayStar({ tier }: { tier: Exclude<DailyStarTier, "none"> }) {
  if (tier === "gold") {
    return (
      <Star
        className="h-3 w-3 fill-amber-400 text-amber-500 sm:h-3.5 sm:w-3.5"
        aria-label="Gold star — any reading logged"
      />
    );
  }

  if (tier === "red") {
    return (
      <Star
        className="h-3 w-3 fill-red-500 text-red-600 sm:h-3.5 sm:w-3.5"
        aria-label="Red star — 15+ minutes"
      />
    );
  }

  return (
    <Star
      className="daily-star-diamond h-3.5 w-3.5 fill-sky-100 text-cyan-400 sm:h-4 sm:w-4"
      aria-label="Diamond star — 30+ minutes"
    />
  );
}

function cellClasses(tier: DailyStarTier, isToday: boolean): string {
  const todayRing =
    isToday ? "ring-1 ring-blue-500 ring-offset-1" : "";

  if (tier === "none") {
    return `${todayRing} bg-slate-50 text-slate-600`;
  }

  return `${todayRing} bg-amber-50 text-amber-800`;
}

function tierTitle(dateKey: string, tier: DailyStarTier, minutes: number): string {
  if (tier === "none") {
    return `No reading logged on ${dateKey}`;
  }
  if (tier === "gold") {
    return minutes > 0
      ? `Gold star on ${dateKey} (${minutes.toFixed(0)} min)`
      : `Gold star on ${dateKey} (pages logged)`;
  }
  if (tier === "red") {
    return `Red star on ${dateKey} (${minutes.toFixed(0)} min)`;
  }
  return `Diamond star on ${dateKey} (${minutes.toFixed(0)} min)`;
}

export function MonthlyReadingCalendar() {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() };
  const [view, setView] = useState(today);
  const { readingDays, dailyMinutes } = useReadingSessionLog();

  const isCurrentMonth = isSameMonth(view, today);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(view.year, view.month, 1)),
    [view.year, view.month],
  );

  const cells = useMemo(
    () => getMonthCalendarCells(view.year, view.month, now),
    [view.year, view.month, now],
  );

  const daysReadThisMonth = useMemo(
    () => countReadingDaysInMonth(new Set(readingDays), view.year, view.month),
    [readingDays, view.year, view.month],
  );

  function goToPreviousMonth() {
    setView((current) => shiftMonth(current.year, current.month, -1));
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setView((current) => shiftMonth(current.year, current.month, 1));
  }

  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mx-auto w-[75%] min-w-[75%] max-w-full">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Monthly counter
            </p>
            <p className="truncate font-display text-sm font-bold text-slate-900 sm:text-base">
              {monthLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setView(today)}
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-50"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mb-2 text-[12px] font-medium text-slate-500">
          {daysReadThisMonth}{" "}
          {daysReadThisMonth === 1 ? "day" : "days"} read
          <span className="text-slate-400">
            {" "}
            · gold any log · red 15+ · diamond 30+
          </span>
        </p>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]"
            >
              {label}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (cell.type === "empty") {
              return (
                <div
                  key={`empty-${index}`}
                  className="reading-calendar-cell-height"
                />
              );
            }

            const minutes = dailyMinutes.get(cell.dateKey) ?? 0;
            const hasLoggedSession = readingDays.has(cell.dateKey);
            const tier = starTierForDay(minutes, hasLoggedSession);
            const isToday = Boolean(cell.isToday && isCurrentMonth);

            return (
              <div
                key={cell.dateKey}
                className={`reading-calendar-cell-height flex items-center justify-center rounded-md text-[12px] font-semibold transition-colors sm:text-xs ${cellClasses(tier, isToday)}`}
                title={tierTitle(cell.dateKey, tier, minutes)}
              >
                {tier === "none" ? (
                  <span>{cell.day}</span>
                ) : (
                  <CalendarDayStar tier={tier} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
