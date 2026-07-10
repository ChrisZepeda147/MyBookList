import type { BookMetadataResult } from "@/lib/google-books";
import { hasRealDescription } from "@/lib/book-descriptions";

export async function fetchVolumeDescriptionClient(
  volumeId: string,
): Promise<string | null> {
  if (!volumeId.trim()) return null;

  try {
    const params = new URLSearchParams({ id: volumeId.trim() });
    const response = await fetch(`/api/books/metadata?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const meta = (await response.json()) as BookMetadataResult;
    return hasRealDescription(meta.description) ? meta.description : null;
  } catch {
    return null;
  }
}

export async function fetchBookMetadataClient(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
  isbn?: string | null;
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

  try {
    const response = await fetch(`/api/books/metadata?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const meta = (await response.json()) as BookMetadataResult;
    return hasRealDescription(meta.description) ? meta : null;
  } catch {
    return null;
  }
}
