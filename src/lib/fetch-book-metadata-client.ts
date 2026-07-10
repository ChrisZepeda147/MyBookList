import type { BookMetadataResult } from "@/lib/google-books";
import { hasRealDescription } from "@/lib/book-descriptions";

export async function fetchOpenLibraryDescriptionClient(input: {
  title: string;
  author: string;
  workKey?: string | null;
}): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title: input.title,
      author: input.author,
    });
    if (input.workKey) {
      params.set("workKey", input.workKey);
    }
    const response = await fetch(`/api/books/metadata?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const meta = (await response.json()) as BookMetadataResult;
    return hasRealDescription(meta.description) ? meta.description : null;
  } catch {
    return null;
  }
}

export async function fetchVolumeDescriptionClient(
  volumeId: string,
  fallback?: { title: string; author: string },
): Promise<string | null> {
  if (!volumeId.trim()) return null;

  try {
    const params = new URLSearchParams({ id: volumeId.trim() });
    const response = await fetch(`/api/books/metadata?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (response.ok) {
      const meta = (await response.json()) as BookMetadataResult;
      if (hasRealDescription(meta.description)) return meta.description;
    }
  } catch {
    // Fall through to title/author lookup.
  }

  if (!fallback) return null;
  return fetchOpenLibraryDescriptionClient(fallback);
}

export async function fetchBookMetadataClient(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
  isbn?: string | null;
  openLibraryWorkKey?: string | null;
}): Promise<BookMetadataResult | null> {
  const params = new URLSearchParams({
    title: input.title,
    author: input.author,
  });
  if (input.googleBooksId) {
    params.set("id", input.googleBooksId);
  }
  if (input.isbn) {
    params.set("isbn", input.isbn);
  }
  if (input.openLibraryWorkKey) {
    params.set("workKey", input.openLibraryWorkKey);
  }

  try {
    const response = await fetch(`/api/books/metadata?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const meta = (await response.json()) as BookMetadataResult;
    return hasRealDescription(meta.description) ? meta : null;
  } catch {
    return null;
  }
}
