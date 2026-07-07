"use client";

import { Check, Lock, Shield, Trophy } from "lucide-react";
import {
  getStreakStyle,
  getStreakStyleForDay,
  isStreakRankUnlocked,
  STREAK_RANK_REWARDS,
  STREAK_SHIELD_MILESTONE_INTERVAL,
} from "@/lib/reading-streak";
import { useReadingStreak } from "@/hooks/useReadingStreak";
import { StreakShieldBadge } from "@/components/StreakShieldBadge";
import { StreakStyleCard, StreakStyleSwatch } from "@/components/StreakStyleCard";

export function RankRewardsSection() {
  const { streak, streakShields, shieldOffer } = useReadingStreak();
  const activeStyleId = getStreakStyle(streak).id;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <h2 id="rank-rewards-title" className="text-base font-semibold text-slate-900">
            Rank Rewards
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Preview every streak color tier. Your current streak is{" "}
            <span className="font-semibold text-slate-700">{streak} days</span>.
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-xl border p-4 ${
          shieldOffer.available
            ? "border-sky-200 bg-sky-50/70"
            : "border-slate-100 bg-slate-50/60"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-lg">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Streak Shield</h3>
              <StreakShieldBadge count={streakShields} variant="light" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Earn 1 shield every {STREAK_SHIELD_MILESTONE_INTERVAL} consecutive
              reading days (5, 10, 15…). When you miss a day, you&apos;ll be
              prompted to spend a shield and keep your streak alive.
            </p>
            {shieldOffer.available && (
              <p className="mt-2 text-xs font-semibold text-sky-700">
                Your {shieldOffer.preservedStreak}-day streak is at risk — check
                the prompt on screen to use a shield.
              </p>
            )}
          </div>
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              streakShields > 0
                ? "bg-sky-100 text-sky-600"
                : "bg-slate-100 text-slate-400"
            }`}
            aria-label={streakShields > 0 ? "Shield available" : "No shields yet"}
          >
            {streakShields > 0 ? (
              <Shield className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {STREAK_RANK_REWARDS.map((reward) => {
          const unlocked = isStreakRankUnlocked(reward, streak);
          const isActive = reward.id === activeStyleId;
          const style = getStreakStyleForDay(reward.previewDay);

          return (
            <li
              key={reward.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isActive
                  ? "border-blue-200 bg-blue-50/50"
                  : unlocked
                    ? "border-slate-100 bg-slate-50/50"
                    : "border-slate-100 bg-white opacity-80"
              }`}
            >
              <StreakStyleSwatch
                style={style}
                dayIndex={reward.previewDay}
                iconsOnly
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-900">{reward.title}</p>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                    {reward.unlockLabel}
                  </span>
                  {isActive && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {reward.description}
                </p>
              </div>

              <div className="hidden w-14 shrink-0 sm:block">
                <StreakStyleCard
                  dayIndex={reward.previewDay}
                  state="current"
                  compact
                  showLabel={false}
                  iconsOnly
                />
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  unlocked
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
                }`}
                aria-label={unlocked ? "Unlocked" : "Locked"}
              >
                {unlocked ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
