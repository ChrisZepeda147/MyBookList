"use client";

import { Flame, Star } from "lucide-react";
import {
  getStreakStyleForDay,
  type StreakDayCardState,
  type StreakRankStyle,
} from "@/lib/reading-streak";

/** Icon sizes — 20% larger than previous h-3 / h-3.5 / h-4 / h-5 / h-7. */
export const STREAK_STAR_SIZE = {
  compact: "h-[0.9rem] w-[0.9rem]",
  default: "h-[1.05rem] w-[1.05rem]",
  current: "h-[1.2rem] w-[1.2rem]",
} as const;

export const STREAK_FLAME_SIZE = {
  header: "h-[2.1rem] w-[2.1rem]",
  swatch: "h-[1.2rem] w-[1.2rem]",
  swatchLg: "h-[1.5rem] w-[1.5rem]",
} as const;

interface StreakStyleCardProps {
  dayIndex: number;
  state: StreakDayCardState;
  compact?: boolean;
  showLabel?: boolean;
  /** Neutral box — tier color applies to the star only (rank rewards preview). */
  iconsOnly?: boolean;
  /** Dark uniform cards for the streak header — tier color on active icon only. */
  headerVariant?: boolean;
  /** Streak count used to color the active card icon in header mode. */
  activeTierDay?: number;
}

function cardSizeClasses(compact: boolean, state: StreakDayCardState) {
  if (compact) {
    return "rounded-xl px-2 py-2 min-h-[4rem]";
  }
  return `rounded-2xl px-2 py-3 ${state === "current" ? "shadow-sm" : ""}`;
}

function numberSizeClasses(compact: boolean, state: StreakDayCardState) {
  if (compact) return "text-lg font-bold";
  if (state === "current") return "text-3xl font-bold";
  return "text-2xl font-bold";
}

function starSizeClasses(compact: boolean, state: StreakDayCardState) {
  if (compact) return STREAK_STAR_SIZE.compact;
  if (state === "current") return STREAK_STAR_SIZE.current;
  return STREAK_STAR_SIZE.default;
}

function getStarIconClass(style: StreakRankStyle): string | undefined {
  if (style.fireClass === "streak-fire-ember") return "streak-star-ember";
  if (style.fireClass === "streak-fire-gradient") return "streak-star-gradient";
  if (style.fireClass === "streak-fire-aurora") return "streak-star-aurora";
  if (style.fireClass === "streak-fire-legendary") return "streak-star-legendary";
  return undefined;
}

function neutralBoxClasses(state: StreakDayCardState) {
  if (state === "current") {
    return "border-2 border-slate-300 bg-white text-slate-800";
  }
  if (state === "completed") {
    return "border border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border border-slate-200 bg-white text-slate-400";
}

export function StreakStyleStar({
  dayIndex,
  className,
  muted = false,
  lightBg = false,
}: {
  dayIndex: number;
  className?: string;
  muted?: boolean;
  lightBg?: boolean;
}) {
  const style = getStreakStyleForDay(dayIndex);
  const iconClass = getStarIconClass(style);
  const sizeClass = className ?? STREAK_STAR_SIZE.current;

  if (dayIndex === 0 && lightBg) {
    return (
      <Star
        className={`fill-slate-400 ${sizeClass} ${muted ? "opacity-70" : ""}`}
        strokeWidth={0}
        aria-hidden
      />
    );
  }
  if (iconClass) {
    return (
      <Star
        className={`fill-current ${iconClass} ${sizeClass} ${muted ? "opacity-70" : ""}`}
        strokeWidth={0}
        aria-hidden
      />
    );
  }

  return (
    <Star
      className={`fill-current ${sizeClass} ${muted ? "opacity-70" : ""}`}
      style={{ color: style.fire }}
      strokeWidth={0}
      aria-hidden
    />
  );
}

function headerBoxClasses(state: StreakDayCardState) {
  const base = "border bg-slate-800 text-slate-200";
  if (state === "current") {
    return `${base} border-2 border-slate-500 shadow-md shadow-black/30`;
  }
  if (state === "completed") {
    return `${base} border-slate-700 text-slate-400`;
  }
  return `${base} border-slate-700/90 text-slate-500`;
}

export function StreakStyleCard({
  dayIndex,
  state,
  compact = false,
  showLabel = true,
  iconsOnly = false,
  headerVariant = false,
  activeTierDay = 0,
}: StreakStyleCardProps) {
  const style = getStreakStyleForDay(dayIndex);
  const starClass = starSizeClasses(compact, state);

  if (headerVariant) {
    return (
      <div
        className={`flex min-w-0 flex-1 flex-col items-center justify-between rounded-xl px-1 py-2 min-h-[3.75rem] ${headerBoxClasses(state)}`}
      >
        {state === "future" ? (
          <div className={`rounded-full border-2 border-slate-500 ${starClass}`} />
        ) : (
          <StreakStyleStar
            dayIndex={state === "current" ? activeTierDay : dayIndex}
            className={starClass}
          />
        )}
        <span
          className={`font-display text-lg font-bold leading-none sm:text-xl ${state === "current" ? "text-white" : ""}`}
        >
          {dayIndex}
        </span>
        {showLabel && (
          <span className="text-[9px] font-medium text-slate-500 sm:text-[10px]">days</span>
        )}
      </div>
    );
  }

  if (state === "future") {
    return (
      <div
        className={`flex min-w-0 flex-1 flex-col items-center justify-between ${cardSizeClasses(compact, state)} border border-slate-200 bg-white text-slate-400`}
      >
        <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
        <span
          className={`font-display leading-none text-slate-400 ${numberSizeClasses(compact, state)}`}
        >
          {dayIndex}
        </span>
        {showLabel && (
          <span className="text-[10px] font-medium">days</span>
        )}
      </div>
    );
  }

  const isMuted = state === "completed";

  if (iconsOnly) {
    return (
      <div
        className={`flex min-w-0 flex-1 flex-col items-center justify-between ${cardSizeClasses(compact, state)} ${neutralBoxClasses(state)}`}
      >
        <StreakStyleStar
          dayIndex={dayIndex}
          className={starClass}
          muted={isMuted}
          lightBg
        />
        <span
          className={`font-display leading-none ${numberSizeClasses(compact, state)}`}
        >
          {dayIndex}
        </span>
        {showLabel && (
          <span className="text-[10px] font-medium text-slate-500">days</span>
        )}
      </div>
    );
  }

  if (style.kind === "gradient" || style.kind === "legendary") {
    const cardClass = isMuted ? style.cardMutedClass : style.cardClass;
    return (
      <div
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-between overflow-hidden ${cardClass ?? ""} ${cardSizeClasses(compact, state)} ${style.kind === "legendary" && !isMuted ? "streak-legendary-sparkle" : ""}`}
      >
        <StreakStyleStar
          dayIndex={dayIndex}
          className={starClass}
          muted={isMuted}
        />
        <span
          className={`font-display leading-none ${numberSizeClasses(compact, state)}`}
        >
          {dayIndex}
        </span>
        {showLabel && (
          <span className="text-[10px] font-medium opacity-90">days</span>
        )}
      </div>
    );
  }

  const bg = isMuted ? style.cardMutedBg : style.cardBg;
  const color = isMuted ? style.cardMutedText : style.cardText;

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-between ${cardSizeClasses(compact, state)}`}
      style={{ backgroundColor: bg, color }}
    >
      <Star
        className={`fill-current ${starClass} ${isMuted ? "opacity-80" : ""}`}
        strokeWidth={0}
        aria-hidden
      />
      <span
        className={`font-display leading-none ${numberSizeClasses(compact, state)} ${isMuted ? "opacity-90" : ""}`}
      >
        {dayIndex}
      </span>
      {showLabel && (
        <span className={`text-[10px] font-medium ${isMuted ? "opacity-70" : "opacity-90"}`}>
          days
        </span>
      )}
    </div>
  );
}

interface StreakStyleFireProps {
  dayIndex: number;
  className?: string;
  lightBg?: boolean;
}

export function StreakStyleFire({
  dayIndex,
  className = STREAK_FLAME_SIZE.header,
  lightBg = false,
}: StreakStyleFireProps) {
  const style = getStreakStyleForDay(dayIndex);

  if (dayIndex === 0 && lightBg) {
    return (
      <Flame
        className={`fill-current text-slate-400 ${className}`}
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }
  if (style.fireClass) {
    return (
      <Flame
        className={`fill-current ${style.fireClass} ${className}`}
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  return (
    <Flame
      className={`fill-current ${className}`}
      style={{ color: style.fire }}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

export function StreakStyleSwatch({
  style: _style,
  dayIndex,
  iconsOnly = false,
}: {
  style: StreakRankStyle;
  dayIndex: number;
  iconsOnly?: boolean;
}) {
  if (iconsOnly) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <StreakStyleFire
          dayIndex={dayIndex}
          className={STREAK_FLAME_SIZE.swatch}
          lightBg
        />
      </div>
    );
  }

  const style = getStreakStyleForDay(dayIndex);

  if (style.kind === "gradient" || style.kind === "legendary") {
    return (
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ${style.cardClass ?? ""} ${style.kind === "legendary" ? "streak-legendary-sparkle" : ""}`}
      >
        <StreakStyleFire dayIndex={dayIndex} className={STREAK_FLAME_SIZE.swatchLg} />
      </div>
    );
  }

  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: style.cardBg, color: style.cardText }}
    >
      <StreakStyleFire dayIndex={dayIndex} className={STREAK_FLAME_SIZE.swatchLg} />
    </div>
  );
}
