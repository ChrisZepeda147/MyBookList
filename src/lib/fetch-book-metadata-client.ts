import type { BookMetadataResult } from "@/lib/google-books";

export async function fetchBookMetadataClient(input: {
  title: string;
  author: string;
  googleBooksId?: string | null;
}): Promise<BookMetadataResult | null> {
  const params = new URLSearchParams({
    title: input.title,
    author: input.author,
  });
  if (input.googleBooksId) {
    params.set("id", input.googleBooksId);
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
