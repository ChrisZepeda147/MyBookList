/** Reference photo and aspect ratio (687×1024). */
export const REFERENCE_BOOKSHELF = "/bookshelf/reference-bookshelf.png";
export const REFERENCE_ASPECT = 687 / 1024;

/** Shelf surface Y positions (% from top of stage) — tuned to reference photo. */
export const SHELF_ROW_LINES = [21.8, 32.8, 44.0, 54.5, 74.4] as const;

/** Cubby height above each shelf surface (% of stage height). */
export const CUBBY_HEIGHT_PCT = 12;

/** Horizontal bounds for book placement on any shelf row. */
export const SHELF_MIN_X = 7.5;
export const SHELF_MAX_X = 92.5;

export interface ShelfRowBand {
  row: number;
  shelfLinePct: number;
  minX: number;
  maxX: number;
}

export const SHELF_ROW_BANDS: ShelfRowBand[] = SHELF_ROW_LINES.map(
  (shelfLinePct, row) => ({
    row,
    shelfLinePct,
    minX: SHELF_MIN_X,
    maxX: SHELF_MAX_X,
  }),
);

/** Turntable on bottom center — books cannot overlap this band. */
export function isBlockedOnRow(
  row: number,
  xPct: number,
  widthPct: number,
): boolean {
  if (row !== 4) return false;
  const blockLeft = 31;
  const blockRight = 68;
  return xPct + widthPct > blockLeft && xPct < blockRight;
}

export const LAYOUT_STORAGE_KEY = "bookshelf_photo_layout_v3";
