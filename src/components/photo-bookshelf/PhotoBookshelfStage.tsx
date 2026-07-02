"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { BookEntry } from "@/lib/types";
import {
  CUBBY_HEIGHT_PCT,
  REFERENCE_BOOKSHELF,
  SHELF_ROW_BANDS,
} from "@/lib/photo-bookshelf/zones";
import {
  computePhotoBookshelfFit,
  type PhotoBookshelfFitRect,
} from "@/lib/photo-bookshelf/fit";
import {
  hitTestShelf,
  spineStyleForPlacement,
  type PlacedBook,
  type ShelfLayoutState,
} from "@/lib/photo-bookshelf/layout";
import { BookSpineTile } from "@/components/photo-bookshelf/BookSpineTile";

interface PhotoBookshelfStageProps {
  books: BookEntry[];
  layout: ShelfLayoutState;
  onSelectBook: (book: BookEntry) => void;
  onMoveBook: (bookId: string, row: number, xPct: number) => void;
  newlyAddedId: string | null;
  readOnly?: boolean;
}

export function PhotoBookshelfStage({
  books,
  layout,
  onSelectBook,
  onMoveBook,
  newlyAddedId,
  readOnly = false,
}: PhotoBookshelfStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<PhotoBookshelfFitRect>({
    leftPct: 0,
    topPct: 0,
    widthPct: 100,
    heightPct: 100,
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetRow, setDropTargetRow] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setFit(computePhotoBookshelfFit(width, height));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bookById = useMemo(
    () => new Map(books.map((b) => [b.id, b])),
    [books],
  );

  const placements = useMemo(() => {
    return layout.placed
      .map((p) => {
        const book = bookById.get(p.bookId);
        if (!book) return null;
        const style = spineStyleForPlacement(book, p);
        if (!style) return null;
        return { book, placement: p, style };
      })
      .filter(Boolean) as {
      book: BookEntry;
      placement: PlacedBook;
      style: NonNullable<ReturnType<typeof spineStyleForPlacement>>;
    }[];
  }, [layout.placed, bookById]);

  const pointerToPct = useCallback((clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      xPct: ((clientX - rect.left) / rect.width) * 100,
      yPct: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const updateDropTarget = useCallback(
    (clientX: number, clientY: number) => {
      const pt = pointerToPct(clientX, clientY);
      if (!pt) return;
      const hit = hitTestShelf(pt.xPct, pt.yPct);
      setDropTargetRow(hit?.row ?? null);
    },
    [pointerToPct],
  );

  const finishDrag = useCallback(
    (bookId: string, clientX: number, clientY: number) => {
      const pt = pointerToPct(clientX, clientY);
      if (pt) {
        const hit = hitTestShelf(pt.xPct, pt.yPct);
        if (hit) onMoveBook(bookId, hit.row, hit.xPct);
      }
      setDraggingId(null);
      setDropTargetRow(null);
    },
    [onMoveBook, pointerToPct],
  );

  const handleDragPointerDown = useCallback(
    (bookId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingId(bookId);
      updateDropTarget(e.clientX, e.clientY);
    },
    [readOnly, updateDropTarget],
  );

  const handleDragPointerMove = useCallback(
    (bookId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      if (draggingId !== bookId) return;
      e.preventDefault();
      updateDropTarget(e.clientX, e.clientY);
    },
    [draggingId, updateDropTarget],
  );

  const handleDragPointerEnd = useCallback(
    (bookId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      if (draggingId !== bookId) return;
      e.preventDefault();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      finishDrag(bookId, e.clientX, e.clientY);
    },
    [draggingId, finishDrag],
  );

  const gutterLeftPct = fit.leftPct;
  const gutterRightPct = 100 - fit.leftPct - fit.widthPct;

  return (
    <div
      ref={containerRef}
      className="photo-bookshelf-frame relative h-full min-h-0 w-full overflow-hidden bg-white"
    >
      {gutterLeftPct > 0.25 && (
        <div
          className="photo-bookshelf-wall photo-bookshelf-wall--left"
          style={{ width: `${gutterLeftPct}%` }}
          aria-hidden
        />
      )}
      {gutterRightPct > 0.25 && (
        <div
          className="photo-bookshelf-wall photo-bookshelf-wall--right"
          style={{ width: `${gutterRightPct}%` }}
          aria-hidden
        />
      )}

      <div
        ref={stageRef}
        className="photo-bookshelf-stage absolute z-[1]"
        style={{
          left: `${fit.leftPct}%`,
          top: `${fit.topPct}%`,
          width: `${fit.widthPct}%`,
          height: `${fit.heightPct}%`,
        }}
      >
        <Image
          src={REFERENCE_BOOKSHELF}
          alt="Wooden bookshelf with vinyl records and turntable"
          fill
          priority
          className="photo-bookshelf-bg object-cover object-center"
          sizes="(max-width: 768px) 100vw, 720px"
          draggable={false}
        />

        <div className="photo-bookshelf-vignette pointer-events-none absolute inset-0" aria-hidden />

        {SHELF_ROW_BANDS.map((band) => {
          const active = dropTargetRow === band.row;
          return (
            <div
              key={band.row}
              className={`photo-shelf-drop-zone pointer-events-none absolute ${active ? "photo-shelf-drop-zone--active" : ""}`}
              style={{
                left: `${band.minX}%`,
                width: `${band.maxX - band.minX}%`,
                bottom: `${100 - band.shelfLinePct}%`,
                height: `${CUBBY_HEIGHT_PCT}%`,
              }}
              aria-hidden
            />
          );
        })}

        <div className="photo-bookshelf-books absolute inset-0">
          {placements.map(({ book, style }) => (
            <BookSpineTile
              key={book.id}
              book={book}
              style={style}
              isNew={newlyAddedId === book.id}
              isDragging={draggingId === book.id}
              readOnly={readOnly}
              onSelect={() => onSelectBook(book)}
              onHandlePointerDown={(e) => handleDragPointerDown(book.id, e)}
              onHandlePointerMove={(e) => handleDragPointerMove(book.id, e)}
              onHandlePointerUp={(e) => handleDragPointerEnd(book.id, e)}
              onHandlePointerCancel={(e) => handleDragPointerEnd(book.id, e)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
