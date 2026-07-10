import type { ReadingSessionLogEntry } from "@/lib/types";

/** Local calendar date key (YYYY-MM-DD). */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function shiftDateKey(key: string, deltaDays: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + deltaDays);
  return toLocalDateKey(date);
}

/** Calendar day a session counts toward — always the session date, not server sync time. */
export function sessionToDateKey(session: ReadingSessionLogEntry): string {
  const raw = session.date?.trim();
  if (!raw) {
    if (session.createdAt) {
      return toLocalDateKey(new Date(session.createdAt));
    }
    return toLocalDateKey(new Date());
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Date-only values (no time) — use as-is to avoid UTC midnight shifting the day.
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly && !raw.includes("T")) {
    return dateOnly[1]!;
  }

  return toLocalDateKey(new Date(raw));
}

/** Unique local dates that have at least one logged session. */
export function readingDaysFromSessions(
  sessions: ReadingSessionLogEntry[],
): Set<string> {
  const days = new Set<string>();
  for (const session of sessions) {
    days.add(sessionToDateKey(session));
  }
  return days;
}

export const STREAK_SHIELD_MILESTONE_INTERVAL = 5;

function countStreakFromAnchor(
  anchor: string,
  readingDays: Set<string>,
): number {
  let streak = 0;
  let cursor = anchor;
  while (readingDays.has(cursor)) {
    streak++;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

/** Streak count from a pre-built set of reading days. */
export function calculateStreakFromDays(
  readingDays: Set<string>,
  now = new Date(),
): number {
  if (readingDays.size === 0) return 0;

  const today = toLocalDateKey(now);
  const yesterday = shiftDateKey(today, -1);

  let anchor: string | null = null;
  if (readingDays.has(today)) anchor = today;
  else if (readingDays.has(yesterday)) anchor = yesterday;
  else return 0;

  return countStreakFromAnchor(anchor, readingDays);
}

/**
 * Consecutive-day streak from the reading session log.
 * Counts backward from today (if read today) or yesterday (grace until end of today).
 * Resets to 0 when a calendar day is skipped.
 */
export function calculateReadingStreak(
  sessions: ReadingSessionLogEntry[],
  now = new Date(),
): number {
  return calculateStreakFromDays(readingDaysFromSessions(sessions), now);
}

export interface StreakShieldConfig {
  streakShields: number;
  lastShieldMilestone: number;
  lastShieldedDate: string | null;
  shieldActivatedOn: string | null;
  shieldOfferDismissedFor: string | null;
}

export interface ShieldOffer {
  available: boolean;
  missedDate: string | null;
  preservedStreak: number;
}

export interface StreakEvaluation {
  streak: number;
  shieldActivatedToday: boolean;
  shieldsEarned: number;
  shieldOffer: ShieldOffer;
  profileUpdates: Partial<StreakShieldConfig & { streakShields: number }> | null;
}

function buildEffectiveReadingDays(
  sessions: ReadingSessionLogEntry[],
  lastShieldedDate: string | null,
): Set<string> {
  const days = readingDaysFromSessions(sessions);
  if (lastShieldedDate) days.add(lastShieldedDate);
  return days;
}

function canBridgeMissedDay(
  realDays: Set<string>,
  now: Date,
  lastShieldedDate: string | null,
): boolean {
  const today = toLocalDateKey(now);
  const yesterday = shiftDateKey(today, -1);
  const dayBeforeYesterday = shiftDateKey(today, -2);

  if (realDays.has(today) || realDays.has(yesterday)) return false;
  if (!realDays.has(dayBeforeYesterday)) return false;
  if (lastShieldedDate === yesterday) return false;

  return true;
}

/** Detect whether the user can be prompted to spend a Streak Shield. */
export function getShieldOffer(
  sessions: ReadingSessionLogEntry[],
  config: StreakShieldConfig,
  now = new Date(),
): ShieldOffer {
  const empty: ShieldOffer = {
    available: false,
    missedDate: null,
    preservedStreak: 0,
  };

  if (config.streakShields <= 0) return empty;

  const realDays = readingDaysFromSessions(sessions);
  const effectiveDays = buildEffectiveReadingDays(sessions, config.lastShieldedDate);
  const streak = calculateStreakFromDays(effectiveDays, now);
  if (streak > 0) return empty;
  if (!canBridgeMissedDay(realDays, now, config.lastShieldedDate)) return empty;

  const yesterday = shiftDateKey(toLocalDateKey(now), -1);
  if (config.shieldOfferDismissedFor === yesterday) return empty;

  const bridgedDays = new Set(realDays);
  bridgedDays.add(yesterday);
  const preservedStreak = calculateStreakFromDays(bridgedDays, now);
  if (preservedStreak <= 0) return empty;

  return {
    available: true,
    missedDate: yesterday,
    preservedStreak,
  };
}

export function buildShieldConsumptionUpdates(
  config: StreakShieldConfig,
  missedDate: string,
  now = new Date(),
): Partial<StreakShieldConfig & { streakShields: number }> {
  return {
    streakShields: Math.max(0, config.streakShields - 1),
    lastShieldedDate: missedDate,
    shieldActivatedOn: toLocalDateKey(now),
    shieldOfferDismissedFor: null,
  };
}

export function buildShieldDeclineUpdates(
  missedDate: string,
): Partial<StreakShieldConfig> {
  return {
    shieldOfferDismissedFor: missedDate,
    lastShieldMilestone: 0,
    lastShieldedDate: null,
  };
}

/** Largest 5-day milestone reached (5, 10, 15…) without exceeding streak. */
export function streakShieldMilestone(streak: number): number {
  if (streak < STREAK_SHIELD_MILESTONE_INTERVAL) return 0;
  return (
    Math.floor(streak / STREAK_SHIELD_MILESTONE_INTERVAL) *
    STREAK_SHIELD_MILESTONE_INTERVAL
  );
}

/**
 * Streak evaluation with Streak Shield earning (shields are spent only when the user confirms).
 * Returns profile updates when shields are earned or milestones reset.
 */
export function evaluateReadingStreak(
  sessions: ReadingSessionLogEntry[],
  config: StreakShieldConfig,
  now = new Date(),
): StreakEvaluation {
  const profileUpdates: Partial<StreakShieldConfig & { streakShields: number }> =
    {};
  let {
    streakShields,
    lastShieldMilestone,
    lastShieldedDate,
    shieldActivatedOn,
  } = config;

  const today = toLocalDateKey(now);
  let shieldsEarned = 0;
  const shieldOffer = getShieldOffer(sessions, config, now);

  const effectiveDays = buildEffectiveReadingDays(sessions, lastShieldedDate);
  const streak = calculateStreakFromDays(effectiveDays, now);

  if (streak === 0) {
    if (!shieldOffer.available) {
      if (lastShieldMilestone !== 0) {
        profileUpdates.lastShieldMilestone = 0;
        lastShieldMilestone = 0;
      }
      if (lastShieldedDate !== null) {
        profileUpdates.lastShieldedDate = null;
        lastShieldedDate = null;
      }
    }

    return {
      streak: 0,
      shieldActivatedToday: shieldActivatedOn === today,
      shieldsEarned: 0,
      shieldOffer,
      profileUpdates: Object.keys(profileUpdates).length > 0 ? profileUpdates : null,
    };
  }

  const milestone = streakShieldMilestone(streak);
  if (milestone > lastShieldMilestone) {
    const earned =
      (milestone - lastShieldMilestone) / STREAK_SHIELD_MILESTONE_INTERVAL;
    streakShields += earned;
    shieldsEarned = earned;
    lastShieldMilestone = milestone;
    profileUpdates.streakShields = streakShields;
    profileUpdates.lastShieldMilestone = milestone;
  }

  return {
    streak,
    shieldActivatedToday: shieldActivatedOn === today,
    shieldsEarned,
    shieldOffer,
    profileUpdates: Object.keys(profileUpdates).length > 0 ? profileUpdates : null,
  };
}

export type StreakStyleKind = "none" | "solid" | "gradient" | "legendary";

export interface StreakRankStyle {
  kind: StreakStyleKind;
  id: string;
  label: string;
  fire: string;
  cardBg: string;
  cardText: string;
  cardMutedBg: string;
  cardMutedText: string;
  cardClass?: string;
  cardMutedClass?: string;
  fireClass?: string;
}

const STARTER_STYLE: StreakRankStyle = {
  kind: "none",
  id: "starter",
  label: "Starter",
  fire: "#ffffff",
  cardBg: "#64748b",
  cardText: "#f8fafc",
  cardMutedBg: "#f1f5f9",
  cardMutedText: "#64748b",
};

const EMBER_STYLE: StreakRankStyle = {
  kind: "gradient",
  id: "ember",
  label: "Ember",
  fire: "#ea580c",
  cardBg: "#16a34a",
  cardText: "#ffffff",
  cardMutedBg: "#d1fae5",
  cardMutedText: "#b45309",
  cardClass: "streak-ember-card",
  cardMutedClass: "streak-ember-card-muted",
  fireClass: "streak-fire-ember",
};

const EMERALD_STYLE: StreakRankStyle = {
  kind: "solid",
  id: "emerald",
  label: "Emerald",
  fire: "#10b981",
  cardBg: "#059669",
  cardText: "#ecfdf5",
  cardMutedBg: "#d1fae5",
  cardMutedText: "#047857",
};

const PRISM_STYLE: StreakRankStyle = {
  kind: "gradient",
  id: "prism",
  label: "Prism",
  fire: "#a855f7",
  cardBg: "#9333ea",
  cardText: "#ffffff",
  cardMutedBg: "#f3e8ff",
  cardMutedText: "#7e22ce",
  cardClass: "streak-gradient-card",
  cardMutedClass: "streak-gradient-card-muted",
  fireClass: "streak-fire-gradient",
};

const AURORA_STYLE: StreakRankStyle = {
  kind: "gradient",
  id: "aurora",
  label: "Aurora",
  fire: "#22d3ee",
  cardBg: "#7c3aed",
  cardText: "#ffffff",
  cardMutedBg: "#e0f2fe",
  cardMutedText: "#6d28d9",
  cardClass: "streak-aurora-card",
  cardMutedClass: "streak-aurora-card-muted",
  fireClass: "streak-fire-aurora",
};

const COSMIC_STYLE: StreakRankStyle = {
  kind: "legendary",
  id: "cosmic",
  label: "Cosmic",
  fire: "#22d3ee",
  cardBg: "#6366f1",
  cardText: "#ffffff",
  cardMutedBg: "#ede9fe",
  cardMutedText: "#4338ca",
  cardClass: "streak-legendary-card",
  cardMutedClass: "streak-legendary-card-muted",
  fireClass: "streak-fire-legendary",
};

const SOLAR_STYLE: StreakRankStyle = {
  kind: "gradient",
  id: "solar",
  label: "Solar",
  fire: "#f97316",
  cardBg: "#ea580c",
  cardText: "#ffffff",
  cardMutedBg: "#ffedd5",
  cardMutedText: "#c2410c",
  cardClass: "streak-solar-card",
  cardMutedClass: "streak-solar-card-muted",
  fireClass: "streak-fire-solar",
};

const NEBULA_STYLE: StreakRankStyle = {
  kind: "legendary",
  id: "nebula",
  label: "Nebula",
  fire: "#e879f9",
  cardBg: "#7c3aed",
  cardText: "#ffffff",
  cardMutedBg: "#ede9fe",
  cardMutedText: "#6d28d9",
  cardClass: "streak-nebula-card",
  cardMutedClass: "streak-nebula-card-muted",
  fireClass: "streak-fire-nebula",
};

export const STREAK_STYLE_SELECT_MIN = 30;

export const STREAK_STYLE_BY_ID: Record<string, StreakRankStyle> = {
  starter: STARTER_STYLE,
  emerald: EMERALD_STYLE,
  ember: EMBER_STYLE,
  prism: PRISM_STYLE,
  aurora: AURORA_STYLE,
  cosmic: COSMIC_STYLE,
  solar: SOLAR_STYLE,
  nebula: NEBULA_STYLE,
};

/** Visual styling for a given streak day count (0, 1, 2, 3…). */
export function getStreakStyleForDay(day: number): StreakRankStyle {
  if (day <= 0) return STARTER_STYLE;
  if (day >= 25) return NEBULA_STYLE;
  if (day >= 21) return SOLAR_STYLE;
  if (day >= 15) return COSMIC_STYLE;
  if (day >= 10) return AURORA_STYLE;
  if (day >= 6) return PRISM_STYLE;
  if (day >= 3) return EMBER_STYLE;
  return EMERALD_STYLE;
}

export function getUnlockedStreakStyleIds(streak: number): string[] {
  return STREAK_RANK_REWARDS.filter(
    (reward) => reward.id !== "starter" && isStreakRankUnlocked(reward, streak),
  ).map((reward) => reward.id);
}

/** Styling applied to the user's active streak (optional equipped style at 30+ days). */
export function getStreakStyle(
  streak: number,
  preferredStyleId?: string | null,
): StreakRankStyle {
  if (streak >= STREAK_STYLE_SELECT_MIN && preferredStyleId) {
    const preferred = STREAK_STYLE_BY_ID[preferredStyleId];
    if (
      preferred &&
      getUnlockedStreakStyleIds(streak).includes(preferredStyleId)
    ) {
      return preferred;
    }
  }
  return getStreakStyleForDay(streak);
}

export function streakRankLabel(
  streak: number,
  preferredStyleId?: string | null,
): string {
  return getStreakStyle(streak, preferredStyleId).label;
}

export interface StreakRankReward {
  id: string;
  unlockLabel: string;
  title: string;
  description: string;
  previewDay: number;
  minStreak: number;
}

export const STREAK_RANK_REWARDS: StreakRankReward[] = [
  {
    id: "starter",
    unlockLabel: "Day 0",
    title: "Starter",
    description: "Muted gray and white before your first reading day.",
    previewDay: 0,
    minStreak: 0,
  },
  {
    id: "emerald",
    unlockLabel: "Days 1–2",
    title: "Emerald",
    description: "Rich emerald green as you spark your first reading days.",
    previewDay: 2,
    minStreak: 1,
  },
  {
    id: "ember",
    unlockLabel: "Days 3–5",
    title: "Ember",
    description: "Warm ember red melting into green as your habit catches fire.",
    previewDay: 4,
    minStreak: 3,
  },
  {
    id: "prism",
    unlockLabel: "Days 6–9",
    title: "Prism",
    description: "Premium purple-to-pink gradient on your flame and star.",
    previewDay: 7,
    minStreak: 6,
  },
  {
    id: "aurora",
    unlockLabel: "Days 10–14",
    title: "Aurora",
    description: "Shifting rainbow hues as your streak keeps climbing.",
    previewDay: 12,
    minStreak: 10,
  },
  {
    id: "cosmic",
    unlockLabel: "Days 15–20",
    title: "Cosmic",
    description: "Neon metallic gradient with a subtle sparkle overlay.",
    previewDay: 17,
    minStreak: 15,
  },
  {
    id: "solar",
    unlockLabel: "Days 21–24",
    title: "Solar",
    description: "Blazing gold and coral flares — your streak is radiating heat.",
    previewDay: 22,
    minStreak: 21,
  },
  {
    id: "nebula",
    unlockLabel: "Days 25–29",
    title: "Nebula",
    description: "Deep-space violet, magenta, and cyan drifting like a nebula.",
    previewDay: 27,
    minStreak: 25,
  },
];

export function isStreakRankUnlocked(
  reward: StreakRankReward,
  streak: number,
): boolean {
  return streak >= reward.minStreak;
}

export function getActiveStreakRankReward(
  streak: number,
): StreakRankReward | undefined {
  const unlocked = STREAK_RANK_REWARDS.filter((r) =>
    isStreakRankUnlocked(r, streak),
  );
  return unlocked[unlocked.length - 1];
}

export const STREAK_WINDOW_SIZE = 7;

/** Page index for a 7-day block (0 → days 0–6, 1 → days 7–13, …). */
export function getStreakPageIndex(streak: number): number {
  return Math.floor(streak / STREAK_WINDOW_SIZE);
}

/** First day index for a 7-day page block. Auto-advances when streak hits 7, 14, 21… */
export function getDefaultStreakWindowStart(streak: number): number {
  return getStreakPageIndex(streak) * STREAK_WINDOW_SIZE;
}

/** Snap any offset to the start of a 7-day page block. */
export function snapStreakWindowStart(start: number): number {
  return Math.max(0, Math.floor(start / STREAK_WINDOW_SIZE) * STREAK_WINDOW_SIZE);
}

/** Shift by one 7-day page (negative = earlier milestones). */
export function shiftStreakWindowStart(start: number, pageDelta: number): number {
  return snapStreakWindowStart(start + pageDelta * STREAK_WINDOW_SIZE);
}

/** Day indices visible on a given page block. */
export function getStreakWindowDays(windowStart: number): number[] {
  return Array.from({ length: STREAK_WINDOW_SIZE }, (_, i) => windowStart + i);
}

export type StreakDayCardState = "completed" | "current" | "future";

export function getStreakDayCardState(
  dayIndex: number,
  streak: number,
): StreakDayCardState {
  if (dayIndex < streak) return "completed";
  if (dayIndex === streak) return "current";
  return "future";
}

/** @deprecated Use getStreakStyle instead. */
export type StreakTier = "none" | "bronze" | "silver" | "gold" | "epic";

/** @deprecated Use getStreakStyle instead. */
export function getStreakTier(streak: number): StreakTier {
  const style = getStreakStyle(streak);
  if (style.kind === "legendary") return "epic";
  if (style.id === "aurora") return "gold";
  if (style.kind === "gradient") return "gold";
  if (streak >= 5) return "silver";
  if (streak >= 1) return "bronze";
  return "none";
}

/** @deprecated Use streakRankLabel instead. */
export function streakTierLabel(tier: StreakTier): string {
  switch (tier) {
    case "epic":
      return "Cosmic";
    case "gold":
      return "Prism Gradient";
    case "silver":
      return "Emerald";
    case "bronze":
      return "Ember";
    default:
      return "Starter";
  }
}

/** @deprecated Use getStreakStyle instead. */
export function getStreakTierPalette(tier: StreakTier) {
  const streak =
    tier === "epic"
      ? 21
      : tier === "gold"
        ? 17
        : tier === "silver"
          ? 7
          : tier === "bronze"
            ? 2
            : 0;
  const style = getStreakStyle(streak);
  return {
    fire: style.fire,
    cardBg: style.cardBg,
    cardText: style.cardText,
    cardMutedBg: style.cardMutedBg,
  };
}

/** Dashboard header title, e.g. "Scope's List". */
export function formatPersonalizedListTitle(username: string): string {
  const name = username.trim() || "My";
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;
  return `${possessive} List`;
}

/** CSS class for streak-reactive header/name color (null when streak is 0). */
export function getStreakRewardTextClassName(
  streak: number,
  preferredStyleId?: string | null,
): string | null {
  if (streak <= 0) return null;
  const { id } = getStreakStyle(streak, preferredStyleId);
  return `streak-reward-text streak-reward-text--${id}`;
}

/** @deprecated Use getStreakRewardTextClassName */
export function getStreakRewardTextGlowClassName(
  streak: number,
  preferredStyleId?: string | null,
): string | null {
  return getStreakRewardTextClassName(streak, preferredStyleId);
}
