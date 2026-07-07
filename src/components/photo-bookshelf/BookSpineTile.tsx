"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { BookEntry } from "@/lib/types";
import { bookHasDisplayableCover, resolveCoverUrl } from "@/lib/cover-url";
import { spineColorForBook } from "@/lib/library-spine";
import type { SpinePlacementStyle } from "@/lib/photo-bookshelf/layout";

interface BookSpineTileProps {
  book: BookEntry;
  style: SpinePlacementStyle;
  isNew?: boolean;
  isSelected?: boolean;
  readOnly?: boolean;
  onSelect: () => void;
  onSelectForMove?: () => void;
}

export function BookSpineTile({
  book,
  style,
  isNew,
  isSelected = false,
  readOnly = false,
  onSelect,
  onSelectForMove,
}: BookSpineTileProps) {
  const spineColor = spineColorForBook(book.id);
  const coverSrc = bookHasDisplayableCover(book, "list")
    ? resolveCoverUrl(book.coverUrl, "list")
    : null;

  const title = useMemo(() => {
    return book.title.length > 36 ? `${book.title.slice(0, 34)}…` : book.title;
  }, [book.title]);

  const spineClass = [
    "photo-book-spine group",
    isNew ? "photo-book-spine--new" : "",
    isSelected ? "photo-book-spine--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={spineClass}
      style={{
        left: `${style.leftPct}%`,
        bottom: `${style.bottomPct}%`,
        width: `${style.widthPct}%`,
        height: `${style.heightPct}%`,
        zIndex: isSelected ? 200 : style.zIndex,
        ["--spine-tilt" as string]: `${style.rotateDeg}deg`,
        ["--spine-color" as string]: spineColor,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (readOnly) {
            onSelect();
            return;
          }
          onSelectForMove?.();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!readOnly) onSelect();
        }}
        className="photo-book-spine-select block h-full w-full border-0 bg-transparent p-0"
        title={`${book.title} — ${book.author}`}
        aria-pressed={!readOnly && isSelected ? true : undefined}
      >
        <div className="photo-book-spine-inner library-book-spine relative h-full w-full overflow-hidden rounded-t-[2px] border border-black/40">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt=""
              fill
              sizes="80px"
              className="z-0 object-cover object-top"
              unoptimized
              aria-hidden
            />
          ) : null}
          <div className="photo-book-spine-shade absolute inset-0 z-[1]" />
          <span
            className="library-spine-title relative z-[2] mx-auto block max-h-[88%] overflow-hidden text-center text-[6px] font-medium leading-tight tracking-wide text-amber-50/95 sm:text-[7px]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {title}
          </span>
        </div>
      </button>
    </div>
  );
}
