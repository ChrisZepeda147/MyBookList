import type { BookEntry } from "@/lib/types";
import {
  spineHeightForBook,
  spineLeanForBook,
  spineWidthForBook,
} from "@/lib/library-spine";
import {
  LAYOUT_STORAGE_KEY,
  SHELF_BY_ID,
  SHELF_FILL_ORDER,
  SLOT_WIDTH,
  SLOTS_PER_SHELF,
  type ShelfDefinition,
} from "./constants";

export interface PlacedBook {
  bookId: string;
  shelfId: string;
  slot: number;
  tilt: number;
}

export interface ShelfLayoutState {
  placed: PlacedBook[];
}

export interface BookTransform {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  thickness: number;
  height: number;
  depth: number;
}

function hashOffset(id: string, salt: string): number {
  let h = 0;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 997;
  return (h % 100) / 100;
}

/** Map CSS spine helpers to scene units. */
export function bookDimensions(book: BookEntry): Pick<BookTransform, "thickness" | "height" | "depth"> {
  const thickness = spineWidthForBook(book.id, book.title) / 1000;
  const height = spineHeightForBook(book.id) * 0.028;
  const depth = 0.17 + hashOffset(book.id, "depth") * 0.025;
  return { thickness, height, depth };
}

export function shelfSlotX(shelf: ShelfDefinition, slot: number): number {
  const start = shelf.x - shelf.width / 2 + SLOT_WIDTH * 0.65;
  return start + slot * SLOT_WIDTH;
}

export function transformForPlacement(
  book: BookEntry,
  placement: PlacedBook,
): BookTransform | null {
  const shelf = SHELF_BY_ID[placement.shelfId];
  if (!shelf) return null;

  const { thickness, height, depth } = bookDimensions(book);
  const x = shelfSlotX(shelf, placement.slot) + (hashOffset(book.id, "x") - 0.5) * 0.008;
  const y = shelf.y + height / 2 + 0.038;
  const z = -0.06 + (hashOffset(book.id, "z") - 0.5) * 0.012;
  const lean = spineLeanForBook(book.id);
  const rotationY = placement.tilt + (lean * Math.PI) / 180;

  return { x, y, z, rotationY, thickness, height, depth };
}

function occupiedSlots(shelfId: string, placed: PlacedBook[]): Set<number> {
  const set = new Set<number>();
  for (const p of placed) {
    if (p.shelfId === shelfId) set.add(p.slot);
  }
  return set;
}

function nextFreeSlot(shelfId: string, placed: PlacedBook[]): number | null {
  const taken = occupiedSlots(shelfId, placed);
  for (let slot = 0; slot < SLOTS_PER_SHELF; slot++) {
    if (!taken.has(slot)) return slot;
  }
  return null;
}

/** Auto-place books left-to-right, lower shelves first. */
export function autoLayoutBooks(
  books: BookEntry[],
  existing: ShelfLayoutState,
): ShelfLayoutState {
  const placed = [...existing.placed];
  const placedIds = new Set(placed.map((p) => p.bookId));

  for (const book of books) {
    if (placedIds.has(book.id)) continue;

    for (const shelf of SHELF_FILL_ORDER) {
      const slot = nextFreeSlot(shelf.id, placed);
      if (slot == null) continue;
      placed.push({
        bookId: book.id,
        shelfId: shelf.id,
        slot,
        tilt: (hashOffset(book.id, "tilt") - 0.5) * 0.14,
      });
      placedIds.add(book.id);
      break;
    }
  }

  return { placed };
}

/** Add a single book to the next available slot. Does not bulk-place. */
export function addBookToLayout(
  books: BookEntry[],
  layout: ShelfLayoutState,
  bookId: string,
): ShelfLayoutState {
  if (layout.placed.some((p) => p.bookId === bookId)) return layout;
  const book = books.find((b) => b.id === bookId);
  if (!book) return layout;
  return autoLayoutBooks([book], layout);
}

/** Remove placements for books no longer in the library. */
export function pruneLayout(
  books: BookEntry[],
  layout: ShelfLayoutState,
): ShelfLayoutState {
  const bookIds = new Set(books.map((b) => b.id));
  return { placed: layout.placed.filter((p) => bookIds.has(p.bookId)) };
}

export function moveBookToShelf(
  layout: ShelfLayoutState,
  bookId: string,
  shelfId: string,
  slot?: number,
): ShelfLayoutState {
  const without = layout.placed.filter((p) => p.bookId !== bookId);
  const targetSlot = slot ?? nextFreeSlot(shelfId, without);
  if (targetSlot == null) return layout;

  return {
    placed: [
      ...without,
      {
        bookId,
        shelfId,
        slot: targetSlot,
        tilt: (hashOffset(bookId, "tilt") - 0.5) * 0.14,
      },
    ],
  };
}

export function nearestShelfAndSlot(
  worldX: number,
  worldY: number,
): { shelfId: string; slot: number } | null {
  let best: { shelfId: string; slot: number; dist: number } | null = null;

  for (const shelf of SHELF_FILL_ORDER) {
    const dy = Math.abs(worldY - (shelf.y + 0.15));
    if (dy > 0.55) continue;

    const relX = worldX - (shelf.x - shelf.width / 2);
    const slot = Math.max(0, Math.min(SLOTS_PER_SHELF - 1, Math.round(relX / SLOT_WIDTH - 0.65)));
    const sx = shelfSlotX(shelf, slot);
    const dist = Math.hypot(worldX - sx, worldY - shelf.y);

    if (!best || dist < best.dist) {
      best = { shelfId: shelf.id, slot, dist };
    }
  }

  return best ? { shelfId: best.shelfId, slot: best.slot } : null;
}

export function loadLayout(): ShelfLayoutState {
  if (typeof window === "undefined") return { placed: [] };
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return { placed: [] };
    const parsed = JSON.parse(raw) as ShelfLayoutState;
    if (!Array.isArray(parsed.placed)) return { placed: [] };
    return parsed;
  } catch {
    return { placed: [] };
  }
}

export function saveLayout(layout: ShelfLayoutState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}
