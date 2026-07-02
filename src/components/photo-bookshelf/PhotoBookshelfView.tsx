"use client";

import { useEffect, useRef, useCallback, useState, useLayoutEffect } from "react";
import type { BookEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { usePhotoBookshelfShelfLayout } from "@/hooks/usePhotoBookshelfShelfLayout";
import { PhotoBookshelfStage } from "@/components/photo-bookshelf/PhotoBookshelfStage";
import { photoBookshelfShellHeight } from "@/lib/photo-bookshelf/fit";

interface PhotoBookshelfViewProps {
  books: BookEntry[];
  onSelectBook: (book: BookEntry) => void;
  readOnly?: boolean;
  layoutUserId?: string;
}

const SHELL_CLASS =
  "relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm";

/** Photorealistic 2.5D shelf — reference photo backdrop + dynamic book spines. */
export function PhotoBookshelfView({
  books,
  onSelectBook,
  readOnly = false,
  layoutUserId,
}: PhotoBookshelfViewProps) {
  const { user } = useAuth();
  const shelfUserId = layoutUserId ?? user?.id;
  const prevCountRef = useRef(books.length);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState(680);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const { layout, hydrated, moveBook } = usePhotoBookshelfShelfLayout(
    books,
    shelfUserId,
    {
      persist: !readOnly,
    },
  );

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const update = () => {
      setShellHeight(photoBookshelfShellHeight(el.clientWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (books.length > prevCountRef.current) {
      const newest = books[books.length - 1];
      if (newest) {
        setNewlyAddedId(newest.id);
        const t = window.setTimeout(() => setNewlyAddedId(null), 600);
        return () => window.clearTimeout(t);
      }
    }
    prevCountRef.current = books.length;
  }, [books, hydrated]);

  const handleSelectBook = useCallback(
    (book: BookEntry) => {
      onSelectBook(book);
    },
    [onSelectBook],
  );

  if (!hydrated) {
    return (
      <div
        ref={shellRef}
        className={`flex items-center justify-center bg-white ${SHELL_CLASS}`}
        style={{ height: shellHeight }}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600/40 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div ref={shellRef} className={SHELL_CLASS} style={{ height: shellHeight }}>
      <PhotoBookshelfStage
        books={books}
        layout={layout}
        onSelectBook={handleSelectBook}
        onMoveBook={readOnly ? () => {} : moveBook}
        newlyAddedId={newlyAddedId}
        readOnly={readOnly}
      />
      {!readOnly && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-amber-100/90 backdrop-blur-sm">
          Click a book for details · Use grip to rearrange
        </p>
      )}
      {readOnly && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-amber-100/90 backdrop-blur-sm">
          Click a book for details
        </p>
      )}
    </div>
  );
}
