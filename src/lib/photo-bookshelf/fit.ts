import { REFERENCE_ASPECT } from "@/lib/photo-bookshelf/zones";

export interface PhotoBookshelfFitRect {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

/** Just below crown molding — keeps cubby space above top-row books visible. */
export const PHOTO_FOCUS_TOP_PCT = 0.055;

/** Through bottom shelf row, turntable, and lower cabinet doors. */
export const PHOTO_FOCUS_BOTTOM_PCT = 0.9;

export function photoBookshelfFocusBandFraction(): number {
  return PHOTO_FOCUS_BOTTOM_PCT - PHOTO_FOCUS_TOP_PCT;
}

/** Ideal shell height to show the full focus band at container width (full bleed). */
export function photoBookshelfFocusBandHeight(containerW: number): number {
  if (containerW <= 0) return 420;
  const stageH = containerW / REFERENCE_ASPECT;
  return stageH * photoBookshelfFocusBandFraction();
}

export function photoBookshelfShellHeight(containerW: number): number {
  const ideal = photoBookshelfFocusBandHeight(containerW);
  const maxH =
    typeof window !== "undefined" ? window.innerHeight * 0.85 : ideal;
  return Math.max(420, Math.min(ideal, maxH));
}

/**
 * Fill width when possible. Top-anchored at PHOTO_FOCUS_TOP_PCT so cubbies stay
 * visible; shell height is sized to reach PHOTO_FOCUS_BOTTOM_PCT at the bottom.
 */
export function computePhotoBookshelfFit(
  containerW: number,
  containerH: number,
): PhotoBookshelfFitRect {
  if (containerW <= 0 || containerH <= 0) {
    return { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 };
  }

  const bandFrac = photoBookshelfFocusBandFraction();
  const fullStageH = containerW / REFERENCE_ASPECT;
  const idealBandPx = fullStageH * bandFrac;

  let scale = 1;
  if (idealBandPx > containerH) {
    scale = containerH / idealBandPx;
  }

  const stageW = containerW * scale;
  const stageH = fullStageH * scale;
  const left = (containerW - stageW) / 2;
  const top =
    stageH <= containerH
      ? (containerH - stageH) / 2
      : -(stageH * PHOTO_FOCUS_TOP_PCT);

  return {
    leftPct: (left / containerW) * 100,
    topPct: (top / containerH) * 100,
    widthPct: (stageW / containerW) * 100,
    heightPct: (stageH / containerH) * 100,
  };
}
