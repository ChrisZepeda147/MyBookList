import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookEntry, ReadingStatus, SortOption } from "@/lib/types";
import { SORT_OPTIONS } from "@/lib/types";
import { useBookStore } from "@/providers/BookStoreProvider";

const SORT_PREFERENCE_KEY = "sortPreference";

function isSortOption(value: string): value is SortOption {
  return SORT_OPTIONS.some((option) => option.value === value);
}

interface UseFilteredBooksOptions {
  fixedStatus?: ReadingStatus;
  books?: BookEntry[];
  loaded?: boolean;
}

export function useFilteredBooks({
  fixedStatus,
  books: booksOverride,
  loaded: loadedOverride,
}: UseFilteredBooksOptions = {}) {
  const store = useBookStore();
  const books = booksOverride ?? store.books;
  const loaded = loadedOverride ?? store.loaded;
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | "all">(
    fixedStatus ?? "all",
  );
  const [sortBy, setSortByState] = useState<SortOption>("default");

  useEffect(() => {
    const stored = localStorage.getItem(SORT_PREFERENCE_KEY);
    if (stored && isSortOption(stored)) {
      setSortByState(stored);
    }
  }, []);

  const setSortBy = useCallback((value: SortOption) => {
    setSortByState(value);
    localStorage.setItem(SORT_PREFERENCE_KEY, value);
  }, []);

  const filtered = useMemo(() => {
    let result = [...books];

    const activeStatus = fixedStatus ?? statusFilter;
    if (activeStatus !== "all") {
      result = result.filter((b) => b.status === activeStatus);
    }

    switch (sortBy) {
      case "score":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "alphabetical":
        result.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );
        break;
      case "dateCompleted":
        result.sort((a, b) => {
          const aTime = a.dateCompleted
            ? new Date(a.dateCompleted).getTime()
            : 0;
          const bTime = b.dateCompleted
            ? new Date(b.dateCompleted).getTime()
            : 0;
          return bTime - aTime;
        });
        break;
      default:
        break;
    }

    return result;
  }, [books, statusFilter, fixedStatus, sortBy]);

  return {
    books,
    loaded,
    filtered,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    hideStatusFilter: fixedStatus != null,
  };
}
