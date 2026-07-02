"use client";

import { useState } from "react";
import type { BookPrefill, BookSearchResult } from "@/lib/types";
import { BookSearch } from "@/components/BookSearch";
import { ManualBookForm } from "@/components/ManualBookForm";
import { RecommendedBooks } from "@/components/RecommendedBooks";
import { BookPreviewModal } from "@/components/BookPreviewModal";
import { Toast } from "@/components/Toast";
import { SitePageHeader } from "@/components/SitePageHeader";

export default function AddBookPage() {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [prefill, setPrefill] = useState<BookPrefill | null>(null);
  const [previewBook, setPreviewBook] = useState<BookSearchResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showAddedToast(message = "Book added successfully!") {
    setToast(message);
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <SitePageHeader
        title="Add a Book"
        subtitle="Search the catalog, browse recommendations, or enter details manually."
      />

      <div className="min-w-0 max-w-full flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
            mode === "search"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
            mode === "manual"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Add Manually
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-5">
          <BookSearch
            onManualEntry={() => setMode("manual")}
            onSelect={setPreviewBook}
          />

          <RecommendedBooks onSelect={setPreviewBook} />

          <p className="text-center text-sm text-slate-400">
            Tap a search result or recommendation to preview it, then add to your
            list.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {prefill && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Fields pre-filled from your selection — review and add below.
            </div>
          )}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <ManualBookForm
              key={prefill?.title ?? "empty"}
              prefill={prefill}
              onAdded={() => showAddedToast()}
            />
          </div>
          <RecommendedBooks onSelect={setPreviewBook} />
        </div>
      )}

      {previewBook && (
        <BookPreviewModal
          book={previewBook}
          onClose={() => setPreviewBook(null)}
          onAdded={() => {
            setPreviewBook(null);
            showAddedToast();
          }}
        />
      )}

      {toast && (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
