"use client";

import { useEffect, useState } from "react";
import type { BookPrefill } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";
import { resolveBookCategoryTags } from "@/lib/categories";

interface ManualBookFormProps {
  prefill?: BookPrefill | null;
  onAdded?: () => void;
}

export function ManualBookForm({ prefill, onAdded }: ManualBookFormProps) {
  const { addBook } = useBookStore();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [googleBooksId, setGoogleBooksId] = useState<string | undefined>();
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!prefill) return;
    setTitle(prefill.title);
    setAuthor(prefill.author);
    setCoverUrl(prefill.coverUrl);
    setDescription(prefill.description);
    setPageCount(prefill.pageCount ? String(prefill.pageCount) : "");
    setGoogleBooksId(prefill.googleBooksId);
    setApiCategories(prefill.apiCategories ?? []);
    setCategories(prefill.categories);
  }, [prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    addBook({
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl.trim() || null,
      description: description.trim() || null,
      pageCount: pageCount ? parseInt(pageCount, 10) : null,
      apiCategories,
      categories: resolveBookCategoryTags(
        apiCategories,
        categories,
        description.trim() || null,
      ),
      status: "plan_to_read",
      rating: null,
      dateCompleted: null,
      googleBooksId,
    });

    onAdded?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Title *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="The Great Gatsby"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Author *
        </label>
        <input
          type="text"
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="F. Scott Fitzgerald"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Cover Image URL
        </label>
        <input
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="https://example.com/cover.jpg"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="A brief summary of the book…"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Page Count
        </label>
        <input
          type="number"
          min={1}
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          className="w-32 rounded-lg border border-slate-200 px-4 py-2.5 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="320"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
      >
        Add to My List
      </button>
    </form>
  );
}
