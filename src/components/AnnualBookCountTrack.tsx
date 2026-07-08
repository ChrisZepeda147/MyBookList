"use client";

import { BookOpen, Check, Lock } from "lucide-react";
import {
  ANNUAL_BOOK_RANKS,
  getActiveAnnualBookRank,
  isActiveAnnualBookRank,
  isAnnualBookRankUnlocked,
} from "@/lib/annual-book-ranks";
import { useMetrics } from "@/providers/BookStoreProvider";

interface AnnualBookCountTrackProps {
  inModal?: boolean;
}

export function AnnualBookCountTrack({ inModal = false }: AnnualBookCountTrackProps) {
  const { completedThisYear, currentYear } = useMetrics();
  const activeRank = getActiveAnnualBookRank(completedThisYear);

  return (
    <div
      className={`mt-8 border-t pt-6 ${
        inModal ? "border-amber-100/10" : "border-slate-100"
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            inModal
              ? "h-10 w-10 bg-amber-500/15 text-amber-200 sm:h-11 sm:w-11"
              : "h-9 w-9 bg-amber-50 text-amber-600"
          }`}
        >
          <BookOpen className={inModal ? "h-5 w-5" : "h-4 w-4"} />
        </div>
        <div className="min-w-0">
          <h3
            className={`font-semibold ${
              inModal
                ? "rank-rewards-heading text-base sm:text-lg"
                : "text-base text-slate-900"
            }`}
          >
            Annual book ranks
          </h3>
          <p
            className={`mt-0.5 text-xs sm:text-sm ${
              inModal ? "rank-rewards-muted" : "text-slate-500"
            }`}
          >
            Books finished in {currentYear}:{" "}
            <span
              className={
                inModal
                  ? "font-semibold text-amber-100"
                  : "font-semibold text-slate-700"
              }
            >
              {completedThisYear}
            </span>
            . Your title is{" "}
            <span
              className={
                inModal
                  ? "font-semibold text-amber-100"
                  : "font-semibold text-slate-700"
              }
            >
              {activeRank.title}
            </span>
            .
          </p>
        </div>
      </div>

      <div
        className="mt-4 flex flex-row gap-4 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory scrollbar-none pb-1"
        role="list"
        aria-label={`${currentYear} annual book rank milestones`}
      >
        {ANNUAL_BOOK_RANKS.map((rank) => {
          const unlocked = isAnnualBookRankUnlocked(rank, completedThisYear);
          const isActive = isActiveAnnualBookRank(rank, completedThisYear);

          return (
            <article
              key={rank.id}
              role="listitem"
              className={`flex w-[11.5rem] shrink-0 snap-center flex-col rounded-xl border p-3.5 sm:w-[12.5rem] sm:p-4 ${
                inModal
                  ? isActive
                    ? "rank-rewards-annual-card rank-rewards-annual-card--active"
                    : unlocked
                      ? "rank-rewards-annual-card rank-rewards-annual-card--unlocked"
                      : "rank-rewards-annual-card opacity-85"
                  : isActive
                    ? "border-blue-200 bg-blue-50/50"
                    : unlocked
                      ? "border-slate-100 bg-slate-50/60"
                      : "border-slate-100 bg-white opacity-85"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] ${
                    inModal
                      ? "bg-white/10 text-amber-100/75"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {rank.unlockLabel}
                </span>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    unlocked
                      ? "bg-emerald-100 text-emerald-600"
                      : inModal
                        ? "bg-white/10 text-amber-100/50"
                        : "bg-slate-100 text-slate-400"
                  }`}
                  aria-label={unlocked ? "Unlocked" : "Locked"}
                >
                  {unlocked ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                </div>
              </div>

              <h4
                className={`mt-2.5 text-sm font-semibold leading-snug sm:text-base ${
                  inModal ? "rank-rewards-tier-title" : "text-slate-900"
                }`}
              >
                {rank.title}
              </h4>
              <p
                className={`mt-1.5 flex-1 text-xs leading-relaxed sm:text-sm ${
                  inModal ? "rank-rewards-muted" : "text-slate-500"
                }`}
              >
                {rank.description}
              </p>

              {isActive && (
                <span
                  className={`mt-3 inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${
                    inModal
                      ? "bg-blue-600/90 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  Current
                </span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
