export const RATING_MIN = 0;
export const RATING_MAX = 5;
export const RATING_STEP = 0.1;
export const RATING_DEFAULT = 0;

export function clampRating(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, rounded));
}

export function isRated(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}
