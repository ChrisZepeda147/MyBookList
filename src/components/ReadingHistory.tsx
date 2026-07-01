"use client";

import { CalendarDays, Star } from "lucide-react";
import { useMetrics } from "@/providers/BookStoreProvider";

export function ReadingHistory() {
  const { completionHistory, averageRating, ratedBookCount } = useMetrics();

  const grouped = completionHistory.reduce<
    Record<string, typeof completionHistory>
  >((acc, book) => {
    const date = new Date(book.dateCompleted!).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(book);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Completion History
          </h2>
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          <span>
            Avg rating{" "}
            <span className="font-semibold text-amber-600">
              {ratedBookCount > 0 ? averageRating.toFixed(1) : "—"}
            </span>
          </span>
        </p>
      </div>

      {completionHistory.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Mark books as &quot;Completed&quot; to see your reading history here.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {Object.entries(grouped).map(([date, books]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {date}
              </p>
              <ul className="space-y-2">
                {books.map((book) => (
                  <li
                    key={book.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 transition-colors hover:bg-blue-50"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.author}</p>
                    </div>
                    {book.rating !== null && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-600">
                        {book.rating.toFixed(1)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
