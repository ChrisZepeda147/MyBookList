import type { BookEntry } from "@/lib/types";
import type { BookMetadataResult } from "@/lib/google-books";
import {
  hasRealDescription,
  ensureBookDescription,
} from "@/lib/book-descriptions";
import {
  categoriesFromApi,
  resolveBookCategoryTags,
} from "@/lib/categories";
import { isPlausiblePageCount } from "@/lib/page-count";

async function fetchMetadataFromApi(
  book: BookEntry,
): Promise<BookMetadataResult | null> {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
  });
  if (book.googleBooksId) {
    params.set("id", book.googleBooksId);
  }

  const response = await fetch(`/api/books/metadata?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;
  return (await response.json()) as BookMetadataResult;
}

function applyMetadata(
  book: BookEntry,
  meta: BookMetadataResult,
): Partial<BookEntry> {
  const description = hasRealDescription(book.description)
    ? book.description!
    : ensureBookDescription(meta.description ?? book.description);
  const apiCategories =
    meta.apiCategories?.length ? meta.apiCategories : (book.apiCategories ?? []);
  const categories = apiCategories.length
    ? categoriesFromApi(
        apiCategories,
        description,
        book.title,
        book.author,
      )
    : resolveBookCategoryTags(
        book.apiCategories,
        book.categories,
        description,
        book.title,
        book.author,
      );

  return {
    pageCount: meta.pageCount,
    description,
    coverUrl: book.coverUrl ?? meta.coverUrl ?? null,
    googleBooksId: meta.googleBooksId ?? book.googleBooksId,
    apiCategories,
    categories,
  };
}

/** Re-fetch Google metadata for a single book (e.g. after add). */
export async function backfillSingleBookMetadata(
  book: BookEntry,
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): Promise<void> {
  const meta = await fetchMetadataFromApi(book);
  if (!meta) return;

  const updates = applyMetadata(book, meta);
  const patch: Partial<BookEntry> = {};

  if (!hasRealDescription(book.description) && hasRealDescription(updates.description ?? null)) {
    patch.description = updates.description;
  }

  if (
    !book.pageCountLocked &&
    (book.pageCount == null || book.pageCount <= 0) &&
    (updates.pageCount ?? 0) > 0
  ) {
    patch.pageCount = updates.pageCount;
  }

  if (!book.coverUrl && updates.coverUrl) {
    patch.coverUrl = updates.coverUrl;
  }

  if (!book.googleBooksId && updates.googleBooksId) {
    patch.googleBooksId = updates.googleBooksId;
  }

  if (
    updates.apiCategories?.length &&
    updates.apiCategories.join("|") !== (book.apiCategories ?? []).join("|")
  ) {
    patch.apiCategories = updates.apiCategories;
    patch.categories = updates.categories;
  }

  if (Object.keys(patch).length > 0) {
    onUpdate(book.id, patch);
  }
}

/** Re-fetch Google metadata for every book and update stored tags. */
export async function backfillBookMetadata(
  books: BookEntry[],
  onUpdate: (id: string, updates: Partial<BookEntry>) => void,
): Promise<void> {
  const ordered = [...books].sort((a, b) => {
    const aMissing = hasRealDescription(a.description) ? 0 : 1;
    const bMissing = hasRealDescription(b.description) ? 0 : 1;
    return bMissing - aMissing;
  });

  for (const book of ordered) {
    const meta = await fetchMetadataFromApi(book);

    if (meta) {
      const updates = applyMetadata(book, meta);
      const newPages = updates.pageCount ?? 0;
      const currentPages = book.pageCount ?? 0;

      const shouldUpdatePages =
        !book.pageCountLocked &&
        newPages > 0 &&
        isPlausiblePageCount(newPages) &&
        (currentPages <= 0 || !isPlausiblePageCount(currentPages));

      const apiChanged =
        updates.apiCategories?.join("|") !==
        (book.apiCategories ?? []).join("|");
      const categoriesChanged =
        updates.categories?.join("|") !== book.categories.join("|");
      const needsDescription = !hasRealDescription(book.description);
      const descriptionChanged =
        needsDescription && hasRealDescription(updates.description ?? null);

      if (
        shouldUpdatePages ||
        apiChanged ||
        categoriesChanged ||
        descriptionChanged
      ) {
        onUpdate(book.id, {
          ...(shouldUpdatePages ? { pageCount: newPages } : {}),
          ...(updates.apiCategories
            ? { apiCategories: updates.apiCategories }
            : {}),
          ...(updates.categories ? { categories: updates.categories } : {}),
          ...(descriptionChanged ? { description: updates.description } : {}),
          coverUrl: updates.coverUrl ?? book.coverUrl,
          googleBooksId: updates.googleBooksId ?? book.googleBooksId,
        });
      }
    } else {
      const categories = resolveBookCategoryTags(
        book.apiCategories,
        book.categories,
        book.description,
        book.title,
        book.author,
      );
      if (categories.join("|") !== book.categories.join("|")) {
        onUpdate(book.id, { categories });
      }
    }

    await new Promise((r) => setTimeout(r, 250));
  }
}

/** @deprecated Use backfillBookMetadata */
export const backfillMissingPageCounts = backfillBookMetadata;
