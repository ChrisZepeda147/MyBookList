import type { BookEntry } from "@/lib/types";
import {
  spineHeightForBook,
  spineLeanForBook,
  spineWidthForBook,
} from "@/lib/library-spine";
import {
  CUBBY_HEIGHT_PCT,
  isBlockedOnRow,
  LAYOUT_STORAGE_KEY,
  SHELF_MAX_X,
  SHELF_MIN_X,
  SHELF_ROW_BANDS,
  SHELF_ROW_LINES,
} from "./zones";

const LEGACY_KEYS = [
  "bookshelf_photo_layout_v2",
  "bookshelf_photo_layout_v1",
] as const;

export function layoutStorageKey(userId: string): string {
  return `${LAYOUT_STORAGE_KEY}_${userId}`;
}

const SPINE_GAP_PCT = 0.2;

export interface PlacedBook {
  bookId: string;
  /** Shelf row index (0 = top). */
  row: number;
  /** Left edge of spine (% of stage width). */
  xPct: number;
  tilt: number;
}

export interface ShelfLayoutState {
  placed: PlacedBook[];
}

export interface SpinePlacementStyle {
  leftPct: number;
  bottomPct: number;
  widthPct: number;
  heightPct: number;
  rotateDeg: number;
  zIndex: number;
}

export interface SpineMetrics {
  widthPct: number;
  heightPct: number;
}

function hashOffset(id: string, salt: string): number {
  let h = 0;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 997;
  return (h % 100) / 100;
}

export function spineMetricsForBook(book: BookEntry): SpineMetrics {
  const widthPct = Math.min(
    2.2,
    1.2 + ((spineWidthForBook(book.id, book.title) - 28) / 17) * 1.1,
  );
  const heightPct = 6.8 + (spineHeightForBook(book.id) - 9) * 1.15;
  return { widthPct, heightPct };
}

function shelfLinePct(row: number): number {
  return SHELF_ROW_LINES[row] ?? SHELF_ROW_LINES[0]!;
}

function clampRowX(xPct: number, widthPct: number): number {
  return Math.max(SHELF_MIN_X, Math.min(SHELF_MAX_X - widthPct, xPct));
}

function overlapsOnRow(
  row: number,
  xPct: number,
  widthPct: number,
  placed: PlacedBook[],
  booksById: Map<string, BookEntry>,
  excludeBookId?: string,
): boolean {
  for (const other of placed) {
    if (other.row !== row || other.bookId === excludeBookId) continue;
    const book = booksById.get(other.bookId);
    if (!book) continue;
    const otherW = spineMetricsForBook(book).widthPct;
    if (
      xPct + widthPct + SPINE_GAP_PCT > other.xPct &&
      other.xPct + otherW + SPINE_GAP_PCT > xPct
    ) {
      return true;
    }
  }
  return false;
}

function isValidPlacement(
  row: number,
  xPct: number,
  widthPct: number,
  placed: PlacedBook[],
  booksById: Map<string, BookEntry>,
  excludeBookId?: string,
): boolean {
  if (isBlockedOnRow(row, xPct, widthPct)) return false;
  return !overlapsOnRow(row, xPct, widthPct, placed, booksById, excludeBookId);
}

/** Nudge horizontally until valid, preferring the drop point. */
function resolvePlacementX(
  row: number,
  preferredXPct: number,
  book: BookEntry,
  placed: PlacedBook[],
  books: BookEntry[],
  excludeBookId?: string,
): number | null {
  const booksById = new Map(books.map((b) => [b.id, b]));
  const { widthPct } = spineMetricsForBook(book);
  const centered = clampRowX(preferredXPct - widthPct / 2, widthPct);

  const tryX = (x: number): number | null => {
    const clamped = clampRowX(x, widthPct);
    if (isValidPlacement(row, clamped, widthPct, placed, booksById, excludeBookId)) {
      return clamped;
    }
    return null;
  };

  const direct = tryX(centered);
  if (direct != null) return direct;

  const step = 0.25;
  const span = SHELF_MAX_X - SHELF_MIN_X;
  for (let delta = step; delta <= span; delta += step) {
    const right = tryX(centered + delta);
    if (right != null) return right;
    const left = tryX(centered - delta);
    if (left != null) return left;
  }

  return null;
}

/** New books go directly after the rightmost book on the busiest shelf row. */
function autoPlaceNextToOthers(
  book: BookEntry,
  placed: PlacedBook[],
  books: BookEntry[],
): PlacedBook | null {
  const booksById = new Map(books.map((b) => [b.id, b]));
  const { widthPct } = spineMetricsForBook(book);

  const rowOrder = [...SHELF_ROW_BANDS]
    .map((b) => b.row)
    .sort((a, b) => {
      const countA = placed.filter((p) => p.row === a).length;
      const countB = placed.filter((p) => p.row === b).length;
      if (countB !== countA) return countB - countA;
      return b - a;
    });

  for (const row of rowOrder) {
    const onRow = placed
      .filter((p) => p.row === row)
      .sort((a, b) => a.xPct - b.xPct);

    const startPositions: number[] = [SHELF_MIN_X];
    if (onRow.length > 0) {
      const last = onRow[onRow.length - 1]!;
      const lastBook = booksById.get(last.bookId);
      if (lastBook) {
        const lastW = spineMetricsForBook(lastBook).widthPct;
        startPositions.unshift(last.xPct + lastW + SPINE_GAP_PCT);
      }
    }

    for (const startX of startPositions) {
      for (let x = startX; x <= SHELF_MAX_X - widthPct; x += 0.25) {
        const clamped = clampRowX(x, widthPct);
        if (
          isValidPlacement(row, clamped, widthPct, placed, booksById, book.id)
        ) {
          return {
            bookId: book.id,
            row,
            xPct: clamped,
            tilt: (hashOffset(book.id, "tilt") - 0.5) * 5,
          };
        }
      }
    }
  }

  return null;
}

/** Only adds books not already placed — never moves existing books. */
export function autoLayoutBooks(
  books: BookEntry[],
  existing: ShelfLayoutState,
): ShelfLayoutState {
  const placed = [...existing.placed];
  const placedIds = new Set(placed.map((p) => p.bookId));

  for (const book of books) {
    if (placedIds.has(book.id)) continue;
    const placement = autoPlaceNextToOthers(book, placed, books);
    if (!placement) continue;
    placed.push(placement);
    placedIds.add(book.id);
  }

  return { placed };
}

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

export function pruneLayout(
  books: BookEntry[],
  layout: ShelfLayoutState,
): ShelfLayoutState {
  const bookIds = new Set(books.map((b) => b.id));
  return { placed: layout.placed.filter((p) => bookIds.has(p.bookId)) };
}

/** Manual drag — drop where you point; nudge only if blocked or overlapping. */
export function moveBookOnShelf(
  books: BookEntry[],
  layout: ShelfLayoutState,
  bookId: string,
  row: number,
  preferredXPct: number,
): ShelfLayoutState {
  const book = books.find((b) => b.id === bookId);
  if (!book || row < 0 || row >= SHELF_ROW_LINES.length) return layout;

  const without = layout.placed.filter((p) => p.bookId !== bookId);
  const xPct = resolvePlacementX(
    row,
    preferredXPct,
    book,
    without,
    books,
    bookId,
  );
  if (xPct == null) return layout;

  return {
    placed: [
      ...without,
      {
        bookId,
        row,
        xPct,
        tilt: (hashOffset(bookId, "tilt") - 0.5) * 5,
      },
    ],
  };
}

export function spineStyleForPlacement(
  book: BookEntry,
  placement: PlacedBook,
): SpinePlacementStyle | null {
  const line = shelfLinePct(placement.row);
  const { widthPct, heightPct } = spineMetricsForBook(book);
  const leftPct = clampRowX(placement.xPct, widthPct);
  const bottomPct = 100 - line;
  const lean = spineLeanForBook(book.id);
  const rotateDeg = placement.tilt + lean;

  return {
    leftPct,
    bottomPct,
    widthPct,
    heightPct,
    rotateDeg,
    zIndex: 10 + placement.row * 10 + Math.round(leftPct),
  };
}

/** Nearest shelf row under the pointer. */
export function hitTestShelf(
  xPct: number,
  yPct: number,
): { row: number; xPct: number } | null {
  let best: { row: number; xPct: number; dist: number } | null = null;

  for (const band of SHELF_ROW_BANDS) {
    if (yPct < band.shelfLinePct - CUBBY_HEIGHT_PCT) continue;
    if (yPct > band.shelfLinePct + 3) continue;

    const dist = Math.abs(yPct - band.shelfLinePct);
    if (!best || dist < best.dist) {
      best = { row: band.row, xPct, dist };
    }
  }

  return best ? { row: best.row, xPct: best.xPct } : null;
}

interface LegacyPlacedBook {
  bookId: string;
  row?: number;
  shelfId?: string;
  slot?: number;
  xPct?: number;
  tilt: number;
}

function shelfIdToRow(shelfId: string): number | null {
  const match = /^[LCR](\d)$/.exec(shelfId);
  if (!match) return null;
  return Number(match[1]);
}

function migrateLegacyPlacement(
  raw: LegacyPlacedBook,
  books: BookEntry[],
): PlacedBook | null {
  const row =
    typeof raw.row === "number"
      ? raw.row
      : raw.shelfId
        ? shelfIdToRow(raw.shelfId)
        : null;
  if (row == null || row < 0 || row >= SHELF_ROW_LINES.length) return null;

  if (typeof raw.xPct === "number") {
    return {
      bookId: raw.bookId,
      row,
      xPct: raw.xPct,
      tilt: raw.tilt,
    };
  }

  const book = books.find((b) => b.id === raw.bookId);
  if (!book || raw.slot == null) return null;

  const { widthPct } = spineMetricsForBook(book);
  const xPct = clampRowX(SHELF_MIN_X + raw.slot * 2.5, widthPct);
  return { bookId: raw.bookId, row, xPct, tilt: raw.tilt };
}

export function loadLayout(books: BookEntry[], userId: string): ShelfLayoutState {
  if (typeof window === "undefined" || !userId) return { placed: [] };

  const keys = [layoutStorageKey(userId), LAYOUT_STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { placed: LegacyPlacedBook[] };
      if (!Array.isArray(parsed.placed)) continue;

      const placed = parsed.placed
        .map((p) => migrateLegacyPlacement(p, books))
        .filter((p): p is PlacedBook => p !== null);

      return { placed };
    } catch {
      continue;
    }
  }

  return { placed: [] };
}

export function saveLayout(layout: ShelfLayoutState, userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(layoutStorageKey(userId), JSON.stringify(layout));
}
