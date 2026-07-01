"use client";

import { Star } from "lucide-react";
import {
  RATING_DEFAULT,
  RATING_MAX,
  RATING_MIN,
  RATING_STEP,
  clampRating,
  isRated,
} from "@/lib/ratings";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

export function StarRating({
  value,
  onChange,
  readonly = false,
  disabled = false,
  size = "md",
}: StarRatingProps) {
  if (readonly || disabled) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Star
            className={`${sizes[size]} ${disabled ? "text-slate-300" : "fill-amber-400 text-amber-400"}`}
          />
          <span
            className={`text-sm font-semibold ${disabled ? "text-slate-400" : "text-amber-500"}`}
          >
            {isRated(value) ? value.toFixed(1) : "—"}
          </span>
        </div>
        {disabled && (
          <p className="text-xs text-slate-400">Rate after completing</p>
        )}
      </div>
    );
  }

  const sliderValue = value ?? RATING_DEFAULT;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Star className={`${sizes[size]} fill-amber-400 text-amber-400`} />
        <span className="text-lg font-bold text-amber-500">
          {sliderValue.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={RATING_MIN}
        max={RATING_MAX}
        step={RATING_STEP}
        value={sliderValue}
        onChange={(e) => onChange?.(clampRating(parseFloat(e.target.value)))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-400"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{RATING_MIN.toFixed(1)}</span>
        <span>{RATING_MAX.toFixed(1)}</span>
      </div>
    </div>
  );
}
