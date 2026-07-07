"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { BookPrefill } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";
import { useAuth } from "@/providers/AuthProvider";
import { resolveBookCategoryTags } from "@/lib/categories";
import { resolveCoverUrl } from "@/lib/cover-url";
import {
  clearManualBookDraft,
  readManualBookDraft,
  writeManualBookDraft,
} from "@/lib/add-book-drafts";
import { uploadBookCover } from "@/lib/storage/book-cover";
import { createClient } from "@/lib/supabase/client";

interface ManualBookFormProps {
  prefill?: BookPrefill | null;
  onAdded?: () => void;
  onCancel?: () => void;
}

function resolveCoverPreviewSrc(
  coverUrl: string,
  previewUrl: string | null,
): string | null {
  if (previewUrl) return previewUrl;
  return resolveCoverUrl(coverUrl, "list");
}

export function ManualBookForm({ prefill, onAdded, onCancel }: ManualBookFormProps) {
  const { user } = useAuth();
  const { addBook } = useBookStore();
  const initialDraft = readManualBookDraft();
  const [title, setTitle] = useState(initialDraft.title);
  const [author, setAuthor] = useState(initialDraft.author);
  const [coverUrl, setCoverUrl] = useState(initialDraft.coverUrl);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [description, setDescription] = useState(initialDraft.description);
  const [pageCount, setPageCount] = useState(initialDraft.pageCount);
  const [googleBooksId, setGoogleBooksId] = useState<string | undefined>(
    initialDraft.googleBooksId,
  );
  const [apiCategories, setApiCategories] = useState<string[]>(
    initialDraft.apiCategories,
  );
  const [categories, setCategories] = useState<string[]>(initialDraft.categories);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    writeManualBookDraft({
      title,
      author,
      description,
      pageCount,
      coverUrl,
      googleBooksId,
      apiCategories,
      categories,
    });
  }, [
    title,
    author,
    description,
    pageCount,
    coverUrl,
    googleBooksId,
    apiCategories,
    categories,
  ]);

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
    setCoverError(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    writeManualBookDraft({
      title: prefill.title,
      author: prefill.author,
      description: prefill.description,
      pageCount: prefill.pageCount ? String(prefill.pageCount) : "",
      coverUrl: prefill.coverUrl,
      googleBooksId: prefill.googleBooksId,
      apiCategories: prefill.apiCategories ?? [],
      categories: prefill.categories,
    });
  }, [prefill]);

  function resetForm() {
    setTitle("");
    setAuthor("");
    setCoverUrl("");
    setDescription("");
    setPageCount("");
    setGoogleBooksId(undefined);
    setApiCategories([]);
    setCategories([]);
    setCoverError(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    clearManualBookDraft();
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const supabase = createClient();
    if (!supabase || !user?.id) {
      setCoverError("Sign in to upload a cover image.");
      return;
    }

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setCoverPreviewUrl(preview);
    setCoverError(null);
    setCoverUploading(true);

    try {
      const publicUrl = await uploadBookCover(supabase, user.id, file);
      setCoverUrl(publicUrl);
    } catch (err) {
      setCoverError(
        err instanceof Error ? err.message : "Failed to upload cover image.",
      );
      URL.revokeObjectURL(preview);
      setCoverPreviewUrl(null);
    } finally {
      setCoverUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim() || coverUploading) return;

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

    resetForm();
    onAdded?.();
  }

  function handleCancel() {
    resetForm();
    onCancel?.();
  }

  const coverDisplaySrc = resolveCoverPreviewSrc(coverUrl, coverPreviewUrl);

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
          Cover image
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative mx-auto h-40 w-28 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-2 ring-slate-100 sm:mx-0">
            {coverDisplaySrc ? (
              <Image
                src={coverDisplaySrc}
                alt={title.trim() || "Book cover preview"}
                fill
                className="object-cover"
                unoptimized={coverDisplaySrc.startsWith("blob:")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-400">
                No cover yet
              </div>
            )}
            {coverUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium text-slate-600">
                Uploading…
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              type="file"
              accept="image/*"
              disabled={coverUploading}
              onChange={handleCoverFileChange}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Choose an image from your device. On mobile you can pick a photo or
              file from storage.
            </p>
            {coverError && (
              <p className="mt-1 text-xs text-red-600">{coverError}</p>
            )}
          </div>
        </div>
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={coverUploading}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
        >
          Add to My List
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={coverUploading}
          className="w-full rounded-xl border border-slate-200 px-6 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
