import type { AppData, BookEntry, UserProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import { ensureBookDescription } from "@/lib/book-descriptions";
import {
  looksLikeRawApiCategories,
  resolveBookCategoryTags,
} from "@/lib/categories";

const STORAGE_KEY = "mybooklist_data";

function defaultData(): AppData {
  return { profile: { ...DEFAULT_PROFILE }, books: [] };
}

function migrateBook(book: BookEntry): BookEntry {
  const legacy = book as BookEntry & { completedAt?: string | null };

  let apiCategories = book.apiCategories ?? [];
  if (!apiCategories.length && looksLikeRawApiCategories(book.categories ?? [])) {
    apiCategories = book.categories;
  }

  const categories = resolveBookCategoryTags(
    apiCategories,
    book.categories ?? [],
    book.description,
    book.title,
    book.author,
  );

  return {
    ...book,
    pageCount: book.pageCount ?? null,
    currentPage: book.currentPage ?? null,
    description: ensureBookDescription(book.description),
    apiCategories,
    categories,
    dateCompleted: book.dateCompleted ?? legacy.completedAt ?? null,
  };
}

export function loadFromLocalStorage(): AppData {
  if (typeof window === "undefined") return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as AppData;
    const books = (parsed.books ?? []).map(migrateBook);
    const data: AppData = {
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      books,
    };
    saveToLocalStorage(data);
    return data;
  } catch {
    return defaultData();
  }
}

export function saveToLocalStorage(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateProfileLocal(profile: Partial<UserProfile>): UserProfile {
  const data = loadFromLocalStorage();
  data.profile = { ...data.profile, ...profile };
  saveToLocalStorage(data);
  return data.profile;
}

export function addBookLocal(book: BookEntry): BookEntry[] {
  const data = loadFromLocalStorage();
  const entry = migrateBook(book);
  data.books = [entry, ...data.books];
  saveToLocalStorage(data);
  return data.books;
}

export function updateBookLocal(
  id: string,
  updates: Partial<BookEntry>,
): BookEntry[] {
  const data = loadFromLocalStorage();
  data.books = data.books.map((b) => {
    if (b.id !== id) return b;
    return migrateBook({ ...b, ...updates });
  });
  saveToLocalStorage(data);
  return data.books;
}

export function removeBookLocal(id: string): BookEntry[] {
  const data = loadFromLocalStorage();
  data.books = data.books.filter((b) => b.id !== id);
  saveToLocalStorage(data);
  return data.books;
}

export function migrateAllBooksLocal(): BookEntry[] {
  const data = loadFromLocalStorage();
  return data.books;
}
