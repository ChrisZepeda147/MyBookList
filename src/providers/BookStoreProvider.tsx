"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clampRating } from "@/lib/ratings";
import type { BookEntry, ReadingStatus, UserProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import {
  bookNeedsMetadataBackfill,
  scheduleLibraryMetadataBackfill,
  backfillSingleBookMetadata,
} from "@/lib/backfill-pages";
import { resolveBookCategoryTags } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import { formatDbError } from "@/lib/supabase-errors";
import {
  deleteBook,
  fetchBooks,
  fetchProfile,
  insertBook,
  patchBook,
  saveProfile,
} from "@/lib/storage/supabase-db";
import { useAuth } from "@/providers/AuthProvider";

interface BookStoreContextValue {
  profile: UserProfile;
  books: BookEntry[];
  loaded: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addBook: (book: Omit<BookEntry, "id" | "addedAt">) => void;
  updateBook: (id: string, updates: Partial<BookEntry>) => void;
  removeBook: (id: string) => void;
  setBookStatus: (id: string, status: ReadingStatus) => void;
  setBookRating: (id: string, rating: number | null) => void;
  setDateCompleted: (id: string, dateCompleted: string | null) => void;
  setPageCount: (id: string, pageCount: number | null) => void;
  setCurrentPage: (id: string, currentPage: number) => void;
}

const BookStoreContext = createContext<BookStoreContextValue | null>(null);

export function BookStoreProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const booksRef = useRef(books);
  booksRef.current = books;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const applyBookPatch = useCallback(
    async (
      id: string,
      updates: Partial<BookEntry>,
      rollback?: BookEntry,
    ) => {
      const supabase = createClient();
      const userId = userIdRef.current;
      if (!supabase || !userId) return;

      const existing = booksRef.current.find((b) => b.id === id);
      try {
        await patchBook(supabase, userId, id, updates, existing);
      } catch (err) {
        if (rollback) {
          setBooks((prev) =>
            prev.map((b) => (b.id === id ? rollback : b)),
          );
        }
        console.error("[BookStore] Failed to save book:", err);
      }
    },
    [],
  );

  const applyBookMetadataUpdate = useCallback(
    (id: string, updates: Partial<BookEntry>) => {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );
      void applyBookPatch(id, updates);
    },
    [applyBookPatch],
  );

  useEffect(() => {
    if (!authReady) {
      setLoaded(false);
      return;
    }

    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setBooks([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setBooks([]);
    setProfile(DEFAULT_PROFILE);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoaded(true);
        return;
      }

      try {
        const [nextProfile, nextBooks] = await Promise.all([
          fetchProfile(supabase, user.id),
          fetchBooks(supabase, user.id),
        ]);

        if (cancelled) return;

        setProfile(nextProfile);
        setBooks(nextBooks);

        scheduleLibraryMetadataBackfill(nextBooks, applyBookMetadataUpdate);
      } catch (err) {
        console.error("[BookStore] Failed to load user data:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authReady, applyBookMetadataUpdate]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<void> => {
      const previous = profile;
      const next = { ...profile, ...updates };
      setProfile(next);

      const supabase = createClient();
      const userId = userIdRef.current;
      if (!supabase || !userId) return;

      try {
        const saved = await saveProfile(supabase, userId, next);
        setProfile(saved);
      } catch (err) {
        setProfile(previous);
        console.error("[BookStore] Failed to save profile:", err);
        throw err;
      }
    },
    [profile],
  );

  const addBook = useCallback(
    (book: Omit<BookEntry, "id" | "addedAt">) => {
      const tempId = `pending-${crypto.randomUUID()}`;
      const optimistic: BookEntry = {
        ...book,
        id: tempId,
        addedAt: new Date().toISOString(),
        categories: resolveBookCategoryTags(
          book.apiCategories,
          book.categories,
          book.description,
          book.title,
          book.author,
        ),
      };

      setBooks((prev) => [optimistic, ...prev]);

      if (book.status === "completed" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("book-completed"));
      }

      void (async () => {
        const supabase = createClient();
        const userId = userIdRef.current;
        if (!supabase || !userId) {
          setBooks((prev) => prev.filter((b) => b.id !== tempId));
          return;
        }

        const payload = {
          ...book,
          categories: optimistic.categories,
        };

        try {
          const entry = await insertBook(supabase, userId, payload);
          setBooks((prev) => [
            entry,
            ...prev.filter((b) => b.id !== tempId),
          ]);

          if (bookNeedsMetadataBackfill(entry)) {
            void backfillSingleBookMetadata(entry, applyBookMetadataUpdate);
          }
        } catch (err) {
          setBooks((prev) => prev.filter((b) => b.id !== tempId));
          console.error("[BookStore] Failed to add book:", formatDbError(err));
        }
      })();
    },
    [applyBookMetadataUpdate],
  );

  const updateBook = useCallback(
    (id: string, updates: Partial<BookEntry>) => {
      const snapshot = booksRef.current.find((b) => b.id === id);
      if (!snapshot) return;

      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );
      void applyBookPatch(id, updates, snapshot);
    },
    [applyBookPatch],
  );

  const removeBook = useCallback(
    (id: string) => {
      const snapshot = booksRef.current.find((b) => b.id === id);
      if (!snapshot) return;

      setBooks((prev) => prev.filter((b) => b.id !== id));
      void (async () => {
        const supabase = createClient();
        const userId = userIdRef.current;
        if (!supabase || !userId) return;
        try {
          await deleteBook(supabase, userId, id);
        } catch (err) {
          setBooks((prev) => [snapshot, ...prev]);
          console.error("[BookStore] Failed to delete book:", err);
        }
      })();
    },
    [],
  );

  const setBookStatus = useCallback(
    (id: string, status: ReadingStatus) => {
      const book = booksRef.current.find((b) => b.id === id);
      const wasCompleted = book?.status === "completed";
      const dateCompleted =
        status === "completed"
          ? book?.status === "completed" && book.dateCompleted
            ? book.dateCompleted
            : new Date().toISOString()
          : null;
      updateBook(id, {
        status,
        dateCompleted,
        ...(status !== "completed" ? { rating: null } : {}),
      });
      if (status === "completed" && !wasCompleted && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("book-completed"));
      }
    },
    [updateBook],
  );

  const setBookRating = useCallback(
    (id: string, rating: number | null) => {
      const book = booksRef.current.find((b) => b.id === id);
      if (!book || book.status !== "completed") return;
      updateBook(id, { rating: rating == null ? null : clampRating(rating) });
    },
    [updateBook],
  );

  const setDateCompleted = useCallback(
    (id: string, dateCompleted: string | null) => {
      const book = booksRef.current.find((b) => b.id === id);
      if (!book || book.status !== "completed") return;
      updateBook(id, { dateCompleted });
    },
    [updateBook],
  );

  const setPageCount = useCallback(
    (id: string, pageCount: number | null) => {
      const rounded =
        pageCount != null && pageCount > 0 ? Math.round(pageCount) : null;
      updateBook(id, {
        pageCount: rounded,
        pageCountLocked: rounded != null,
      });
    },
    [updateBook],
  );

  const setCurrentPage = useCallback(
    (id: string, currentPage: number) => {
      const rounded = Math.max(1, Math.round(currentPage));
      updateBook(id, { currentPage: rounded });
    },
    [updateBook],
  );

  const value = useMemo(
    () => ({
      profile,
      books,
      loaded,
      updateProfile,
      addBook,
      updateBook,
      removeBook,
      setBookStatus,
      setBookRating,
      setDateCompleted,
      setPageCount,
      setCurrentPage,
    }),
    [
      profile,
      books,
      loaded,
      updateProfile,
      addBook,
      updateBook,
      removeBook,
      setBookStatus,
      setBookRating,
      setDateCompleted,
      setPageCount,
      setCurrentPage,
    ],
  );

  return (
    <BookStoreContext.Provider value={value}>
      {children}
    </BookStoreContext.Provider>
  );
}

export function useBookStore() {
  const ctx = useContext(BookStoreContext);
  if (!ctx) {
    throw new Error("useBookStore must be used within BookStoreProvider");
  }
  return ctx;
}

export function useMetrics() {
  const { books, profile } = useBookStore();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const completedBooks = books.filter((b) => b.status === "completed");

  const completedThisYear = completedBooks.filter((b) => {
    if (!b.dateCompleted) return false;
    return new Date(b.dateCompleted).getFullYear() === currentYear;
  });

  const completedThisMonth = completedBooks.filter((b) => {
    if (!b.dateCompleted) return false;
    const d = new Date(b.dateCompleted);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const sumPages = (list: typeof completedBooks) =>
    list.reduce((sum, b) => sum + (b.pageCount ?? 0), 0);

  const totalPagesRead = sumPages(completedBooks);
  const pagesThisYear = sumPages(completedThisYear);
  const pagesThisMonth = sumPages(completedThisMonth);

  const ratedBooks = books.filter((b) => b.rating !== null);
  const averageRating =
    ratedBooks.length > 0
      ? ratedBooks.reduce((sum, b) => sum + (b.rating ?? 0), 0) /
        ratedBooks.length
      : 0;

  const completionHistory = completedBooks
    .filter((b) => b.dateCompleted)
    .sort(
      (a, b) =>
        new Date(b.dateCompleted!).getTime() -
        new Date(a.dateCompleted!).getTime(),
    );

  const monthName = now.toLocaleString(undefined, { month: "long" });

  return {
    totalRead: completedBooks.length,
    completedThisYear: completedThisYear.length,
    completedThisMonth: completedThisMonth.length,
    readingGoal: profile.readingGoal,
    monthlyReadingGoal: profile.monthlyReadingGoal,
    totalPagesRead,
    pagesThisYear,
    pagesThisMonth,
    yearGoalProgress:
      profile.readingGoal > 0
        ? Math.min(100, (completedThisYear.length / profile.readingGoal) * 100)
        : 0,
    monthGoalProgress:
      profile.monthlyReadingGoal > 0
        ? Math.min(
            100,
            (completedThisMonth.length / profile.monthlyReadingGoal) * 100,
          )
        : 0,
    averageRating,
    ratedBookCount: ratedBooks.length,
    completionHistory,
    monthName,
    currentYear,
  };
}
