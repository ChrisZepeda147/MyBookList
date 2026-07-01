/** Scene-scale bookcase dimensions (meters). Frontal camera faces +Z. */

export type ColumnId = "left" | "center" | "right";

export interface ShelfDefinition {
  id: string;
  column: ColumnId;
  row: number;
  y: number;
  x: number;
  width: number;
  depth: number;
  /** Decorative-only — user books cannot occupy these slots. */
  decor?: "turntable" | "vinyl";
}

export const BOOKCASE_DEPTH = 0.72;
export const BOOKCASE_BACK_Z = -0.34;
export const SHELF_SURFACE_Z = -0.08;

export const COLUMN_WIDTHS = {
  left: 1.12,
  center: 1.38,
  right: 1.12,
} as const;

export const COLUMN_CENTERS = {
  left: -1.34,
  center: 0,
  right: 1.34,
} as const;

/** Open shelf row heights (bottom → top indexing in row field uses 0 = top). */
export const SHELF_Y = [4.38, 3.48, 2.58, 1.68, 0.78] as const;

function shelfId(column: ColumnId, row: number): string {
  const prefix = column === "left" ? "L" : column === "center" ? "C" : "R";
  return `${prefix}${row}`;
}

/** All placeable + decorative shelf cubbies. */
export const SHELVES: ShelfDefinition[] = (["left", "center", "right"] as const).flatMap(
  (column) =>
    SHELF_Y.map((y, row) => {
      const id = shelfId(column, row);
      const decor =
        column === "center" && row === 4
          ? "turntable"
          : column !== "center" && row >= 1 && row <= 3
            ? "vinyl"
            : undefined;
      return {
        id,
        column,
        row,
        y,
        x: COLUMN_CENTERS[column],
        width: COLUMN_WIDTHS[column],
        depth: BOOKCASE_DEPTH - 0.12,
        decor,
      };
    }),
);

export const SHELF_BY_ID = Object.fromEntries(
  SHELVES.map((s) => [s.id, s]),
) as Record<string, ShelfDefinition>;

/** Shelves where user books may be placed (excludes turntable shelf). */
export const BOOKABLE_SHELVES = SHELVES.filter((s) => s.decor !== "turntable");

/** Bottom-to-top fill order: lower shelves first, center prioritized. */
export const SHELF_FILL_ORDER = [
  ...BOOKABLE_SHELVES.filter((s) => s.row === 4),
  ...BOOKABLE_SHELVES.filter((s) => s.row === 3),
  ...BOOKABLE_SHELVES.filter((s) => s.row === 2),
  ...BOOKABLE_SHELVES.filter((s) => s.row === 1),
  ...BOOKABLE_SHELVES.filter((s) => s.row === 0),
].sort((a, b) => {
  const colOrder = { center: 0, left: 1, right: 2 };
  if (a.row !== b.row) return b.row - a.row;
  return colOrder[a.column] - colOrder[b.column];
});

export const SLOTS_PER_SHELF = 14;
export const SLOT_WIDTH = 0.068;

import type { AlbumArtKey } from "@/lib/bookshelf3d/assets";

/** Classic rock vinyl decor — fixed props, not user library items. */
export interface VinylDecorSpec {
  shelfId: string;
  artist: string;
  album: string;
  artKey: AlbumArtKey;
  slotOffset: number;
  rotationY: number;
  faceForward: boolean;
  leanZ?: number;
}

export const VINYL_DECOR: VinylDecorSpec[] = [
  { shelfId: "L1", artist: "The Beatles", album: "Abbey Road", artKey: "abbey-road", slotOffset: 0.6, rotationY: 0.1, faceForward: true },
  { shelfId: "L2", artist: "Pink Floyd", album: "Dark Side of the Moon", artKey: "dark-side", slotOffset: 1.8, rotationY: -0.15, faceForward: false },
  { shelfId: "L2", artist: "Led Zeppelin", album: "IV", artKey: "zeppelin-iv", slotOffset: 3.6, rotationY: 0.06, faceForward: false, leanZ: 0.04 },
  { shelfId: "L3", artist: "Lynyrd Skynyrd", album: "Street Survivors", artKey: "skynyrd", slotOffset: 0.9, rotationY: -0.08, faceForward: false },
  { shelfId: "R0", artist: "The Beatles", album: "Abbey Road", artKey: "abbey-road", slotOffset: 1.2, rotationY: 0.18, faceForward: true },
  { shelfId: "R1", artist: "Pink Floyd", album: "Wish You Were Here", artKey: "wish-you-were-here", slotOffset: 0.7, rotationY: -0.12, faceForward: false },
  { shelfId: "R2", artist: "Led Zeppelin", album: "Physical Graffiti", artKey: "physical-graffiti", slotOffset: 2.8, rotationY: 0.05, faceForward: false },
  { shelfId: "R3", artist: "Lynyrd Skynyrd", album: "Pronounced", artKey: "skynyrd", slotOffset: 1.6, rotationY: -0.16, faceForward: false, leanZ: -0.03 },
];

export const LAYOUT_STORAGE_KEY = "bookshelf3d_layout_v1";
