import type { BookEntry } from "@/lib/types";

export interface ProfileGoalMetrics {
  completedThisYear: number;
  completedThisMonth: number;
  readingGoal: number;
  monthlyReadingGoal: number;
  yearGoalProgress: number;
  monthGoalProgress: number;
  monthName: string;
  currentYear: number;
}

export function computeProfileGoalMetrics(
  books: BookEntry[],
  readingGoal: number,
  monthlyReadingGoal: number,
  now = new Date(),
): ProfileGoalMetrics {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const completedBooks = books.filter((b) => b.status === "completed");

  const completedThisYear = completedBooks.filter((b) => {
    if (!b.dateCompleted) return false;
    return new Date(b.dateCompleted).getFullYear() === currentYear;
  }).length;

  const completedThisMonth = completedBooks.filter((b) => {
    if (!b.dateCompleted) return false;
    const d = new Date(b.dateCompleted);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  const monthName = now.toLocaleString(undefined, { month: "long" });

  return {
    completedThisYear,
    completedThisMonth,
    readingGoal,
    monthlyReadingGoal,
    yearGoalProgress:
      readingGoal > 0
        ? Math.min(100, (completedThisYear / readingGoal) * 100)
        : 0,
    monthGoalProgress:
      monthlyReadingGoal > 0
        ? Math.min(100, (completedThisMonth / monthlyReadingGoal) * 100)
        : 0,
    monthName,
    currentYear,
  };
}
