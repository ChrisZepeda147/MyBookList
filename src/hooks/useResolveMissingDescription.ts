"use client";

import { useEffect, useState } from "react";
import type { BookEntry } from "@/lib/types";
import {
  ensureBookDescription,
  hasRealDescription,
} from "@/lib/book-descriptions";
import { resolveMissingDescriptionForBook } from "@/lib/resolve-missing-description";

export function useResolveMissingDescription(
  book: BookEntry,
  onResolved: (id: string, description: string) => void,
) {
  const [description, setDescription] = useState(
    ensureBookDescription(book.description),
  );
  const [loading, setLoading] = useState(
    !hasRealDescription(book.description),
  );

  useEffect(() => {
    setDescription(ensureBookDescription(book.description));
    setLoading(!hasRealDescription(book.description));
  }, [book.id, book.description]);

  useEffect(() => {
    if (hasRealDescription(book.description)) return;

    let cancelled = false;
    setLoading(true);

    void resolveMissingDescriptionForBook(book)
      .then((resolved) => {
        if (cancelled || !resolved) return;
        setDescription(resolved);
        onResolved(book.id, resolved);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [book.id, book.title, book.author, book.googleBooksId, book.description, onResolved]);

  return { description, loading };
}
