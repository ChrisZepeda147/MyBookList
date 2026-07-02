"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import {
  countReadingDaysInMonth,
  getMonthCalendarCells,
  isSameMonth,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/reading-calendar";

export function MonthlyReadingCalendar() {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() };
  const [view, setView] = useState(today);
  const { readingDays } = useReadingSessionLog();

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
    <section className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mx-auto w-full max-w-full">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-50"
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

        <p className="mb-2 text-[11px] font-medium text-slate-500">
          {daysReadThisMonth} {daysReadThisMonth === 1 ? "day" : "days"} read
        </p>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[9px]"
            >
              {label}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (cell.type === "empty") {
              return (
                <div key={`empty-${index}`} className="h-9 sm:h-10" />
              );
            }

            const hasSession = readingDays.has(cell.dateKey);

            return (
              <div
                key={cell.dateKey}
                className={`flex h-9 items-center justify-center rounded-md text-[11px] font-semibold transition-colors sm:h-10 sm:text-xs ${
                  cell.isToday && isCurrentMonth
                    ? "ring-1 ring-blue-500 ring-offset-1"
                    : ""
                } ${
                  hasSession
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-50 text-slate-600"
                }`}
                title={
                  hasSession
                    ? `Read on ${cell.dateKey}`
                    : `No reading logged on ${cell.dateKey}`
                }
              >
                {hasSession ? (
                  <Star
                    className="h-3 w-3 fill-amber-400 text-amber-500 sm:h-3.5 sm:w-3.5"
                    aria-label={`Read on day ${cell.day}`}
                  />
                ) : (
                  <span>{cell.day}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
