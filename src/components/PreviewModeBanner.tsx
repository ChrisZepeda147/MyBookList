"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useBookStore } from "@/providers/BookStoreProvider";
import { useDemoPreview } from "@/providers/DemoPreviewProvider";

/** Inline strip for the sticky site header (not sticky itself). */
export function PreviewModeBanner() {
  const { isPreviewMode } = useDemoPreview();
  const { profile } = useBookStore();

  if (!isPreviewMode) return null;

  const owner = profile.username?.trim() || "Chris";

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:mt-0">
            <Eye className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">
              Previewing {owner}&apos;s MyBookList
            </p>
            <p className="text-xs text-amber-900/75">
              Same library view as signed in — editing is locked. Sign up to
              track your own books.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-10 sm:pl-0">
          <Link
            href="/login"
            className="rounded-lg border border-amber-300/80 bg-white px-3.5 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100/60"
          >
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-700/20 transition-colors hover:bg-amber-700"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
