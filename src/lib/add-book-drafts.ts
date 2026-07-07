const ADD_BOOK_SEARCH_DRAFT_KEY = "add_book_search_draft";
const ADD_BOOK_MANUAL_DRAFT_KEY = "add_book_manual_draft";

export interface ManualBookDraft {
  title: string;
  author: string;
  description: string;
  pageCount: string;
  coverUrl: string;
  googleBooksId?: string;
  apiCategories: string[];
  categories: string[];
}

const EMPTY_MANUAL_DRAFT: ManualBookDraft = {
  title: "",
  author: "",
  description: "",
  pageCount: "",
  coverUrl: "",
  apiCategories: [],
  categories: [],
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readAddBookSearchDraft(): string {
  if (!canUseStorage()) return "";
  try {
    return localStorage.getItem(ADD_BOOK_SEARCH_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeAddBookSearchDraft(query: string): void {
  if (!canUseStorage()) return;
  try {
    const trimmed = query.trim();
    if (!trimmed) {
      localStorage.removeItem(ADD_BOOK_SEARCH_DRAFT_KEY);
      return;
    }
    localStorage.setItem(ADD_BOOK_SEARCH_DRAFT_KEY, query);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearAddBookSearchDraft(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(ADD_BOOK_SEARCH_DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

export function readManualBookDraft(): ManualBookDraft {
  if (!canUseStorage()) return { ...EMPTY_MANUAL_DRAFT };
  try {
    const raw = localStorage.getItem(ADD_BOOK_MANUAL_DRAFT_KEY);
    if (!raw) return { ...EMPTY_MANUAL_DRAFT };
    const parsed = JSON.parse(raw) as Partial<ManualBookDraft>;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      author: typeof parsed.author === "string" ? parsed.author : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      pageCount: typeof parsed.pageCount === "string" ? parsed.pageCount : "",
      coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : "",
      googleBooksId:
        typeof parsed.googleBooksId === "string" ? parsed.googleBooksId : undefined,
      apiCategories: Array.isArray(parsed.apiCategories)
        ? parsed.apiCategories.filter((c): c is string => typeof c === "string")
        : [],
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.filter((c): c is string => typeof c === "string")
        : [],
    };
  } catch {
    return { ...EMPTY_MANUAL_DRAFT };
  }
}

export function writeManualBookDraft(draft: ManualBookDraft): void {
  if (!canUseStorage()) return;
  try {
    const hasContent =
      draft.title.trim() ||
      draft.author.trim() ||
      draft.description.trim() ||
      draft.pageCount.trim() ||
      draft.coverUrl.trim();
    if (!hasContent) {
      localStorage.removeItem(ADD_BOOK_MANUAL_DRAFT_KEY);
      return;
    }
    localStorage.setItem(ADD_BOOK_MANUAL_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore.
  }
}

export function clearManualBookDraft(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(ADD_BOOK_MANUAL_DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

export { EMPTY_MANUAL_DRAFT };
