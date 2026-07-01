"use client";

import { Search, Plus, BookOpen, X } from "lucide-react";
import type { BookEntry } from "@/lib/types";
import { statusLabel } from "@/lib/types";

interface BookshelfSidebarProps {
  books: BookEntry[];
  placedIds: Set<string>;
  search: string;
  onSearchChange: (value: string) => void;
  onAddBook: (bookId: string) => void;
  onRemoveBook: (bookId: string) => void;
  selectedBookId: string | null;
}

export function BookshelfSidebar({
  books,
  placedIds,
  search,
  onSearchChange,
  onAddBook,
  onRemoveBook,
  selectedBookId,
}: BookshelfSidebarProps) {
  const query = search.trim().toLowerCase();
  const filtered = books.filter(
    (b) =>
      !query ||
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query),
  );

  const onShelf = filtered.filter((b) => placedIds.has(b.id));
  const inLibrary = filtered.filter((b) => !placedIds.has(b.id));

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/90 sm:w-72">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Bookshelf</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Add from your library, drag to rearrange, click for details.
        </p>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your library…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none ring-blue-500/30 focus:ring-2"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {inLibrary.length > 0 && (
          <section className="mb-4">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Add to shelf ({inLibrary.length})
            </p>
            <ul className="space-y-1.5">
              {inLibrary.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => onAddBook(book.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-sm transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">
                        {book.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {book.author}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            On shelf ({onShelf.length})
          </p>
          {onShelf.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">
              No books placed yet. Add from your library above.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {onShelf.map((book) => (
                <li
                  key={book.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    selectedBookId === book.id
                      ? "border-blue-400 bg-blue-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {book.author} · {statusLabel(book.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveBook(book.id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Remove from shelf"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
