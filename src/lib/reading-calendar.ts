import { toLocalDateKey } from "@/lib/reading-streak";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarCell =
  | { type: "empty" }
  | { type: "day"; day: number; dateKey: string; isToday: boolean };

export function getMonthCalendarCells(
  year: number,
  month: number,
  now = new Date(),
): CalendarCell[] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const todayKey = toLocalDateKey(now);

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= lastDay; day++) {
    const dateKey = toLocalDateKey(new Date(year, month, day));
    cells.push({
      type: "day",
      day,
      dateKey,
      isToday: dateKey === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: "empty" });
  }

  return cells;
}

export function countReadingDaysInMonth(
  readingDays: Set<string>,
  year: number,
  month: number,
): number {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  let count = 0;
  for (const key of readingDays) {
    if (key.startsWith(prefix)) count++;
  }
  return count;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isSameMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): boolean {
  return a.year === b.year && a.month === b.month;
}

