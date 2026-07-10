import type { BookEntry } from "@/lib/types";
import { hasRealDescription } from "@/lib/book-descriptions";
import { isGoogleBooksCircuitOpen } from "@/lib/google-books-circuit";
import { fetchBookMetadataClient } from "@/lib/fetch-book-metadata-client";

const inFlight = new Set<string>();

/** Deduped client fetch for a missing library description. */
export async function resolveMissingDescriptionForBook(
  book: BookEntry,
): Promise<string | null> {
  if (hasRealDescription(book.description)) {
    return book.description;
  }
  if (isGoogleBooksCircuitOpen()) return null;
  if (inFlight.has(book.id)) return null;

  inFlight.add(book.id);
  try {
    const meta = await fetchBookMetadataClient({
      title: book.title,
      author: book.author,
      googleBooksId: book.googleBooksId,
    });
    if (!meta || !hasRealDescription(meta.description)) return null;
    return meta.description;
  } finally {
    inFlight.delete(book.id);
  }
}
