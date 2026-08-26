"use client";

import { Check, Lock, Shield, Trophy } from "lucide-react";
import {
  getStreakStyle,
  getStreakStyleForDay,
  isStreakRankUnlocked,
  STREAK_RANK_REWARDS,
  STREAK_SHIELD_MILESTONE_INTERVAL,
  STREAK_STYLE_SELECT_MIN,
} from "@/lib/reading-streak";
import { useReadingStreak } from "@/hooks/useReadingStreak";
import { useBookStore } from "@/providers/BookStoreProvider";
import { AnnualBookCountTrack } from "@/components/AnnualBookCountTrack";
import { StreakShieldBadge } from "@/components/StreakShieldBadge";
import { StreakStyleCard, StreakStyleSwatch } from "@/components/StreakStyleCard";

interface RankRewardsSectionProps {
  inModal?: boolean;
}

export function RankRewardsSection({ inModal = false }: RankRewardsSectionProps) {
  const { streak, streakShields, shieldOffer } = useReadingStreak();
  const { profile, updateProfile } = useBookStore();
  const activeStyle = getStreakStyle(streak, profile.streakStyleId);
  const activeStyleId = activeStyle.id;
  const canSelectStyle = streak >= STREAK_STYLE_SELECT_MIN;

  return (
    <section
      className={
        inModal
          ? "rank-rewards-section--modal rounded-2xl"
          : "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            inModal
              ? "h-10 w-10 bg-amber-500/15 text-amber-200 sm:h-11 sm:w-11"
              : "h-9 w-9 bg-amber-50 text-amber-600"
          }`}
        >
          <Trophy className={inModal ? "h-5 w-5" : "h-4 w-4"} />
        </div>
        <div>
          <h2
            id="rank-rewards-title"
            className={`font-semibold ${
              inModal
                ? "rank-rewards-heading text-lg sm:text-xl"
                : "text-base text-slate-900"
            }`}
          >
            Rank Rewards
          </h2>
          <p
            className={`mt-0.5 ${
              inModal
                ? "rank-rewards-subheading text-sm sm:text-base"
                : "text-xs text-slate-500"
            }`}
          >
            Preview every streak color tier. Your current streak is{" "}
            <span
              className={
                inModal
                  ? "font-semibold text-amber-100"
                  : "font-semibold text-slate-700"
              }
            >
              {streak} days
            </span>
            .
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-xl border p-4 sm:p-[1.1rem] ${
          shieldOffer.available
            ? inModal
              ? "rank-rewards-shield-box border-sky-300/30"
              : "border-sky-200 bg-sky-50/70"
            : inModal
              ? "rank-rewards-shield-box--idle"
              : "border-slate-100 bg-slate-50/60"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100/90 text-lg sm:h-11 sm:w-11">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`text-sm font-semibold sm:text-base ${
                  inModal ? "rank-rewards-heading" : "text-slate-900"
                }`}
              >
                Streak Shield
              </h3>
              <StreakShieldBadge count={streakShields} variant="light" />
            </div>
            <p
              className={`mt-1 text-xs sm:text-sm ${
                inModal ? "rank-rewards-muted" : "text-slate-500"
              }`}
            >
              Earn 1 shield every {STREAK_SHIELD_MILESTONE_INTERVAL} consecutive
              reading days (5, 10, 15…), and 1 shield each time you finish a
              book. When you miss a day, you&apos;ll be prompted to spend a
              shield and keep your streak alive.
            </p>
            {shieldOffer.available && (
              <p className="mt-2 text-xs font-semibold text-sky-300 sm:text-sm">
                Your {shieldOffer.preservedStreak}-day streak is at risk — check
                the prompt on screen to use a shield.
              </p>
            )}
          </div>
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 ${
              streakShields > 0
                ? "bg-sky-100 text-sky-600"
                : inModal
                  ? "bg-white/10 text-amber-100/50"
                  : "bg-slate-100 text-slate-400"
            }`}
            aria-label={streakShields > 0 ? "Shield available" : "No shields yet"}
          >
            {streakShields > 0 ? (
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </div>
        </div>
      </div>

      {canSelectStyle && (
        <p
          className={`mt-5 rounded-xl border px-4 py-3 text-xs sm:text-sm ${
            inModal
              ? "rank-rewards-shield-box border-amber-300/25 text-amber-100/85"
              : "border-amber-200 bg-amber-50/80 text-amber-900/90"
          }`}
        >
          You&apos;ve hit {STREAK_STYLE_SELECT_MIN}+ days — tap{" "}
          <span className="font-semibold">Equip</span> on any unlocked tier to
          wear that style across your profile and streak display.
        </p>
      )}

      <ul className="mt-5 space-y-2.5 sm:space-y-3">
        {STREAK_RANK_REWARDS.map((reward) => {
          const unlocked = isStreakRankUnlocked(reward, streak);
          const isActive = reward.id === activeStyleId;
          const isEquipped = canSelectStyle && profile.streakStyleId === reward.id;
          const style = getStreakStyleForDay(reward.previewDay);

          function handleEquipStyle() {
            if (!canSelectStyle || !unlocked || reward.id === "starter") return;
            void updateProfile({ streakStyleId: reward.id });
          }

          return (
            <li
              key={reward.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors sm:p-3.5 ${
                inModal
                  ? isActive
                    ? "rank-rewards-tier rank-rewards-tier--active"
                    : unlocked
                      ? "rank-rewards-tier rank-rewards-tier--unlocked"
                      : "rank-rewards-tier opacity-80"
                  : isActive
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
                  <p
                    className={`text-sm font-semibold sm:text-base ${
                      inModal ? "rank-rewards-tier-title" : "text-slate-900"
                    }`}
                  >
                    {reward.title}
                  </p>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium sm:text-xs ${
                      inModal
                        ? "bg-white/10 text-amber-100/70"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {reward.unlockLabel}
                  </span>
                  {isActive && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white sm:text-xs">
                      {isEquipped ? "Equipped" : "Current"}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-xs sm:text-sm ${
                    inModal ? "rank-rewards-muted" : "text-slate-500"
                  }`}
                >
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

              {canSelectStyle && unlocked && reward.id !== "starter" && !isActive && (
                <button
                  type="button"
                  onClick={handleEquipStyle}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold sm:text-xs ${
                    inModal
                      ? "border border-amber-200/25 bg-white/10 text-amber-100 hover:bg-white/15"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Equip
                </button>
              )}

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 ${
                  unlocked
                    ? "bg-emerald-100 text-emerald-600"
                    : inModal
                      ? "bg-white/10 text-amber-100/50"
                      : "bg-slate-100 text-slate-400"
                }`}
                aria-label={unlocked ? "Unlocked" : "Locked"}
              >
                {unlocked ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <AnnualBookCountTrack inModal={inModal} />
    </section>
  );
}
