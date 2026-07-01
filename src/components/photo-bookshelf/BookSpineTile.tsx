"use client";

import { useMemo } from "react";
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
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function BookSpineTile({
  book,
  style,
  isNew,
  isDragging,
  readOnly = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: BookSpineTileProps) {
  const spineColor = spineColorForBook(book.id);
  const coverUrl = resolveCoverUrl(book.coverUrl, "modal");

  const title = useMemo(() => {
    return book.title.length > 36 ? `${book.title.slice(0, 34)}…` : book.title;
  }, [book.title]);

  return (
    <button
      type="button"
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : onDragStart}
      onDragEnd={readOnly ? undefined : onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
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
  );
}
