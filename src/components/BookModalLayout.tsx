"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { resolveCoverUrl } from "@/lib/cover-url";

/** Shared book detail / preview modal shell (50% larger than compact baseline). */
export const BOOK_MODAL_PANEL_CLASS =
  "relative z-10 flex max-h-[min(92vh,78rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200";

interface BookModalLayoutProps {
  titleId: string;
  coverUrl: string | null;
  coverAlt: string;
  isClosing: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BookModalLayout({
  titleId,
  coverUrl,
  coverAlt,
  isClosing,
  onClose,
  children,
  footer,
}: BookModalLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const displayCover = resolveCoverUrl(coverUrl, "list");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={onClose}
        aria-label="Close"
      />

      <div
        className={`${BOOK_MODAL_PANEL_CLASS} ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
          <div className="relative mx-auto h-72 w-48 shrink-0 self-start bg-slate-100 sm:mx-0 sm:ml-7 sm:mt-7 sm:h-[21rem] sm:w-[13.5rem]">
            {displayCover ? (
              <Image
                src={displayCover}
                alt={coverAlt}
                fill
                sizes="216px"
                className="rounded-md object-cover object-center shadow-sm"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-slate-100 text-sm text-slate-400">
                No cover
              </div>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-7 pt-5 sm:pl-5">
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
              {children}
            </div>
          </div>
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-7 py-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function BookModalAbout({
  description,
  loading,
  isPlaceholder,
}: {
  description: string;
  loading?: boolean;
  isPlaceholder?: boolean;
}) {
  return (
    <div className="shrink-0">
      <h3 className="mb-1.5 text-sm font-semibold text-slate-700">About</h3>
      <p
        className={`book-description-clamp text-sm leading-relaxed pr-1 ${
          isPlaceholder ? "italic text-slate-500" : "text-slate-600"
        }`}
      >
        {loading ? "Looking up description…" : description}
      </p>
    </div>
  );
}
