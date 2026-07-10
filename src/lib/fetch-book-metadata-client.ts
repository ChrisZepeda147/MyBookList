import type { BookMetadataResult } from "@/lib/google-books";

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
    return (await response.json()) as BookMetadataResult;
  } catch {
    return null;
  }
}
