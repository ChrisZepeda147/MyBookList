"use client";

import { STREAK_FLAME_SIZE, StreakStyleFire } from "@/components/StreakStyleCard";

interface StreakFireIconProps {
  streak: number;
  className?: string;
}

export function StreakFireIcon({
  streak,
  className = STREAK_FLAME_SIZE.header,
}: StreakFireIconProps) {
  return <StreakStyleFire dayIndex={streak} className={className} />;
}
