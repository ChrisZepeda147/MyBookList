import type { ReadingSessionLogEntry } from "@/lib/types";
import { sessionToDateKey } from "@/lib/reading-streak";

/**
 * Daily reading star milestones (total minutes read that calendar day).
 * Streak logic is separate — any session keeps a streak; these only style the day.
 */
/** Mid tier — red star. */
export const RED_STAR_MINUTES = 15;
/** Top tier — diamond star. */
export const DIAMOND_STAR_MINUTES = 30;

export type DailyStarTier = "none" | "gold" | "red" | "diamond";

export const DAILY_STAR_LABELS: Record<
  Exclude<DailyStarTier, "none">,
  string
> = {
  gold: "Gold",
  red: "Red",
  diamond: "Diamond",
};

export function starTierForMinutes(minutes: number): DailyStarTier {
  if (minutes >= DIAMOND_STAR_MINUTES) return "diamond";
  if (minutes >= RED_STAR_MINUTES) return "red";
  if (minutes > 0) return "gold";
  return "none";
}

/**
 * Calendar day star: gold for any logged session (including page-only with 0
 * minutes); red/diamond still require timed minutes.
 */
export function starTierForDay(
  minutes: number,
  hasLoggedSession: boolean,
): DailyStarTier {
  if (minutes >= DIAMOND_STAR_MINUTES) return "diamond";
  if (minutes >= RED_STAR_MINUTES) return "red";
  if (minutes > 0 || hasLoggedSession) return "gold";
  return "none";
}

export function milestoneLabel(tier: Exclude<DailyStarTier, "none">): string {
  return `${DAILY_STAR_LABELS[tier]} Milestone Unlocked!`;
}

/** Aggregate minutes read per local calendar day. */
export function dailyMinutesFromSessions(
  sessions: ReadingSessionLogEntry[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    const key = sessionToDateKey(session);
    const minutes =
      Number.isFinite(session.minutesRead) && session.minutesRead > 0
        ? session.minutesRead
        : Math.max(0, session.secondsRead) / 60;
    totals.set(key, (totals.get(key) ?? 0) + minutes);
  }
  return totals;
}

export function minutesForDate(
  sessions: ReadingSessionLogEntry[],
  dateKey: string,
): number {
  return dailyMinutesFromSessions(sessions).get(dateKey) ?? 0;
}

export function starTierForDate(
  sessions: ReadingSessionLogEntry[],
  dateKey: string,
): DailyStarTier {
  return starTierForMinutes(minutesForDate(sessions, dateKey));
}

/**
 * Live milestones crossed when combining today's saved minutes with the
 * active timer. Returns newly unlocked tiers in order (gold → red → diamond).
 */
export function liveMilestonesCrossed(
  previousTotalMinutes: number,
  nextTotalMinutes: number,
): Array<Exclude<DailyStarTier, "none">> {
  const unlocked: Array<Exclude<DailyStarTier, "none">> = [];
  const thresholds: Array<{
    tier: Exclude<DailyStarTier, "none">;
    crossed: boolean;
  }> = [
    {
      tier: "gold",
      crossed: previousTotalMinutes <= 0 && nextTotalMinutes > 0,
    },
    {
      tier: "red",
      crossed:
        previousTotalMinutes < RED_STAR_MINUTES &&
        nextTotalMinutes >= RED_STAR_MINUTES,
    },
    {
      tier: "diamond",
      crossed:
        previousTotalMinutes < DIAMOND_STAR_MINUTES &&
        nextTotalMinutes >= DIAMOND_STAR_MINUTES,
    },
  ];

  for (const { tier, crossed } of thresholds) {
    if (crossed) unlocked.push(tier);
  }
  return unlocked;
}
