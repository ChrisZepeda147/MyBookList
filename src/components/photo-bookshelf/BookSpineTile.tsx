"use client";

import { useMemo, useRef } from "react";
import { GripVertical } from "lucide-react";
import type { BookEntry } from "@/lib/types";
import { resolveCoverUrl } from "@/lib/cover-url";
import { spineColorForBook } from "@/lib/library-spine";
import type { SpinePlacementStyle } from "@/lib/photo-bookshelf/layout";

interface BookSpineTileProps {
  book: BookEntry;
  style: SpinePlacementStyle;
  isNew?: boolean;
  isDragging?: boolean;
  readOnly?: boolean;
  onSelect: () => void;
  onHandlePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

export function BookSpineTile({
  book,
  style,
  isNew,
  isDragging,
  readOnly = false,
  onSelect,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: BookSpineTileProps) {
  const spineColor = spineColorForBook(book.id);
  const coverUrl = resolveCoverUrl(book.coverUrl, "modal");
  const draggedRef = useRef(false);

  const title = useMemo(() => {
    return book.title.length > 36 ? `${book.title.slice(0, 34)}…` : book.title;
  }, [book.title]);

  return (
    <div
      className={`photo-book-spine group ${isNew ? "photo-book-spine--new" : ""} ${isDragging ? "photo-book-spine--dragging" : ""}`}
      style={{
        left: `${style.leftPct}%`,
        bottom: `${style.bottomPct}%`,
        width: `${style.widthPct}%`,
        height: `${style.heightPct}%`,
        zIndex: isDragging ? 200 : style.zIndex,
        ["--spine-tilt" as string]: `${style.rotateDeg}deg`,
        ["--spine-color" as string]: spineColor,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          onSelect();
        }}
        className="photo-book-spine-select block h-full w-full border-0 bg-transparent p-0"
        title={`${book.title} — ${book.author}`}
      >
        <div className="photo-book-spine-inner library-book-spine relative h-full w-full overflow-hidden rounded-t-[2px] border border-black/40">
          {coverUrl ? (
            <div
              className="absolute inset-0 opacity-90"
              style={{
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          ) : null}
          <div className="photo-book-spine-shade absolute inset-0" />
          <span
            className="library-spine-title relative z-[1] mx-auto block max-h-[88%] overflow-hidden text-center text-[6px] font-medium leading-tight tracking-wide text-amber-50/95 sm:text-[7px]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {title}
          </span>
        </div>
      </button>

      {!readOnly && (
        <button
          type="button"
          className="photo-book-spine-handle"
          aria-label={`Drag to rearrange ${book.title}`}
          onPointerDown={(e) => {
            draggedRef.current = false;
            onHandlePointerDown(e);
          }}
          onPointerMove={(e) => {
            draggedRef.current = true;
            onHandlePointerMove(e);
          }}
          onPointerUp={(e) => {
            onHandlePointerUp(e);
          }}
          onPointerCancel={(e) => {
            onHandlePointerCancel(e);
          }}
        >
          <GripVertical className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
