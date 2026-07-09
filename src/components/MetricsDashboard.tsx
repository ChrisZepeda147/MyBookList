"use client";

import { useMemo } from "react";
import { BookOpen, Gauge } from "lucide-react";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import { averagePagesPerHourFromSessions } from "@/lib/reading-session-log";
import { useMetrics } from "@/providers/BookStoreProvider";

export function MetricsDashboard() {
  const {
    totalRead,
    completedThisYear,
    readingGoal,
    totalPagesRead,
    currentYear,
  } = useMetrics();
  const { sessions } = useReadingSessionLog();

  const averagePagesPerHour = useMemo(
    () => averagePagesPerHourFromSessions(sessions),
    [sessions],
  );

  const timedSessionCount = useMemo(
    () =>
      sessions.filter((s) => s.secondsRead > 0 && s.pagesRead > 0).length,
    [sessions],
  );

  const stats = [
    {
      label: "Books completed",
      value: totalRead,
      detail: "All time",
      icon: BookOpen,
      emblemClass: "text-blue-600",
      bgClass: "bg-blue-50",
    },
    {
      label: `Books in ${currentYear}`,
      value: completedThisYear,
      detail: `Goal: ${readingGoal}`,
      icon: BookOpen,
      emblemClass: "text-red-600",
      bgClass: "bg-red-50",
    },
    {
      label: "Pages read",
      value: totalPagesRead.toLocaleString(),
      detail: "All time",
      icon: BookOpen,
      emblemClass: "text-indigo-600",
      bgClass: "bg-indigo-50",
    },
    {
      label: "Pages/hr",
      value: averagePagesPerHour != null ? averagePagesPerHour.toFixed(1) : "—",
      detail:
        timedSessionCount > 0
          ? `From ${timedSessionCount} timed ${timedSessionCount === 1 ? "session" : "sessions"}`
          : "Timed sessions only",
      icon: Gauge,
      emblemClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
    },
  ] as const;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Reading statistics
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        A snapshot of your reading activity — goals and progress live above.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, emblemClass, bgClass }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-50 p-4 transition-shadow hover:shadow-md"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bgClass}`}>
              <Icon className={`h-5 w-5 ${emblemClass}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
