/**
 * Goodreads-style category parsing from Google Books `volumeInfo.categories`.
 */

import {
  inferGenresFromBookText,
  isGenericDisplayGenre,
  needsGenreInferenceFallback,
  resolveInferredGenresOverGeneric,
  stripLazyApiCategories,
} from "@/lib/refine-general-genres";

export type FictionType = "Fiction" | "Non-Fiction";

export const MAX_GENRE_TAGS = 3;
export const FALLBACK_FICTION_GENRE = "General Fiction";
export const FALLBACK_NONFICTION_GENRE = "General Non-Fiction";

/** Map messy API fragments → clean genre labels. */
const GENRE_MAP: Record<string, string> = {
  "science fiction": "Sci-Fi",
  "historical fiction": "Historical Fiction",
  "young adult fiction": "Young Adult",
  "juvenile fiction": "Young Adult",
  "juvenile nonfiction": "Young Adult",
  "biography & autobiography": "Biography",
  "biography/autobiography": "Biography",
  autobiography: "Autobiography",
  biography: "Biography",
  "comics & graphic novels": "Graphic Novel",
  "graphic novels": "Graphic Novel",
  "self-help": "Self-Help",
  "true crime": "True Crime",
  "social science": "Social Science",
  "political science": "Politics",
  "politics & government": "Politics",
  politics: "Politics",
  psychology: "Psychology",
  philosophy: "Philosophy",
  history: "History",
  military: "Military",
  war: "War",
  drama: "Drama",
  poetry: "Poetry",
  romance: "Romance",
  mystery: "Mystery",
  thriller: "Thriller",
  suspense: "Thriller",
  fantasy: "Fantasy",
  horror: "Horror",
  dystopian: "Dystopian",
  dystopia: "Dystopian",
  adventure: "Adventure",
  classics: "Classics",
  business: "Business",
  economics: "Economics",
  science: "Science",
  technology: "Technology",
  computers: "Technology",
  health: "Health",
  religion: "Religion",
  spirituality: "Spirituality",
  travel: "Travel",
  cooking: "Cooking",
  sports: "Sports",
  music: "Music",
  art: "Art",
  education: "Education",
  law: "Law",
  medicine: "Medicine",
  nature: "Nature",
  memoir: "Memoir",
  journalism: "Journalism",
  humor: "Humor",
  comics: "Comics",
};

/** If any category part matches these, the book is Non-Fiction. */
const STRONG_NONFICTION_PARTS = [
  "nonfiction",
  "non-fiction",
  "biography",
  "autobiography",
  "memoir",
  "history",
  "military",
  "war",
  "psychology",
  "politics",
  "political science",
  "philosophy",
  "self-help",
  "true crime",
  "business",
  "economics",
  "science",
  "technology",
  "health",
  "religion",
  "education",
  "travel",
  "law",
  "medicine",
  "journalism",
  "reference",
  "social science",
  "body, mind & spirit",
  "cooking",
  "sports",
  "nature",
];

/** Parts too generic to show as genre badges. */
const SKIP_GENRE_PARTS = new Set([
  "general",
  "fiction",
  "nonfiction",
  "non-fiction",
  "literary",
  "literature",
  "literary criticism",
  "novel",
  "novels",
  "american",
  "english",
  "european",
  "world",
  "modern",
  "contemporary",
  "united states",
  "great britain",
  "north america",
  "books",
  "literary collections",
]);

const DESCRIPTION_GENRE_HINTS: {
  pattern: RegExp;
  genre: string;
  type: FictionType;
}[] = [
  { pattern: /\b(biograph(y|ies)|autobiograph(y|ies))\b/i, genre: "Biography", type: "Non-Fiction" },
  { pattern: /\bmemoir\b/i, genre: "Memoir", type: "Non-Fiction" },
  { pattern: /\b(military|navy seal|special forces|armed forces)\b/i, genre: "Military", type: "Non-Fiction" },
  { pattern: /\bwar\b/i, genre: "War", type: "Non-Fiction" },
  { pattern: /\bhistory\b/i, genre: "History", type: "Non-Fiction" },
  { pattern: /\bpsycholog(y|ical)\b/i, genre: "Psychology", type: "Non-Fiction" },
  { pattern: /\bpolitic(s|al)\b/i, genre: "Politics", type: "Non-Fiction" },
  { pattern: /\bphilosoph(y|ical)\b/i, genre: "Philosophy", type: "Non-Fiction" },
  { pattern: /\btrue crime\b/i, genre: "True Crime", type: "Non-Fiction" },
  { pattern: /\bself[- ]help\b/i, genre: "Self-Help", type: "Non-Fiction" },
  { pattern: /\bscience fiction\b/i, genre: "Sci-Fi", type: "Fiction" },
  { pattern: /\bdystopi(an|a)\b/i, genre: "Dystopian", type: "Fiction" },
  { pattern: /\bhorror\b/i, genre: "Horror", type: "Fiction" },
  { pattern: /\bthriller\b/i, genre: "Thriller", type: "Fiction" },
  { pattern: /\bmystery\b/i, genre: "Mystery", type: "Fiction" },
  { pattern: /\bromance\b/i, genre: "Romance", type: "Fiction" },
  { pattern: /\bfantasy\b/i, genre: "Fantasy", type: "Fiction" },
  { pattern: /\bdrama\b/i, genre: "Drama", type: "Fiction" },
  { pattern: /\bpoetry\b/i, genre: "Poetry", type: "Fiction" },
];

function splitParts(raw: string[]): string[] {
  return raw.flatMap((r) => r.split("/").map((p) => p.trim())).filter(Boolean);
}

function titleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(text);
}

function partMatchesNonfiction(part: string): boolean {
  const lower = part.toLowerCase();
  if (lower.includes("nonfiction") || lower.includes("non-fiction")) return true;

  for (const signal of STRONG_NONFICTION_PARTS) {
    if (signal === "science" && lower.includes("science fiction")) continue;
    if (lower === signal || lower.startsWith(`${signal} /`) || lower.includes(`& ${signal}`)) {
      return true;
    }
    if (containsWord(lower, signal)) return true;
  }
  return false;
}

function partMatchesFiction(part: string): boolean {
  const lower = part.toLowerCase();
  if (lower.includes("nonfiction") || lower.includes("non-fiction")) return false;
  if (lower.includes("science fiction") || lower.includes("historical fiction")) return true;
  if (containsWord(lower, "fiction")) return true;
  if (containsWord(lower, "novel") || containsWord(lower, "novels")) return true;

  const fictionGenreWords = [
    "romance",
    "mystery",
    "thriller",
    "fantasy",
    "horror",
    "dystopian",
    "dystopia",
    "poetry",
    "drama",
    "comics",
    "graphic novel",
    "adventure",
    "suspense",
  ];
  return fictionGenreWords.some((w) => containsWord(lower, w));
}

export function detectFictionType(parts: string[]): FictionType | null {
  let nonfictionHits = 0;
  let fictionHits = 0;

  for (const part of parts) {
    if (partMatchesNonfiction(part)) nonfictionHits++;
    if (partMatchesFiction(part)) fictionHits++;
  }

  if (nonfictionHits > 0 && fictionHits === 0) return "Non-Fiction";
  if (fictionHits > 0 && nonfictionHits === 0) return "Fiction";
  if (nonfictionHits > 0 && fictionHits > 0) return "Non-Fiction";
  return null;
}

function mapPartToGenre(part: string): string | null {
  const lower = part.toLowerCase().trim();
  if (!lower || SKIP_GENRE_PARTS.has(lower)) return null;
  if (lower === "fiction" || lower.includes("nonfiction")) return null;
  if (lower.includes("science fiction")) return "Sci-Fi";
  if (lower.includes("historical fiction")) return "Historical Fiction";
  if (GENRE_MAP[lower]) return GENRE_MAP[lower];
  if (part.length > 35) return null;
  if (/^\d{4}/.test(part)) return null;
  return titleCase(part);
}

export function extractGenreTags(parts: string[]): string[] {
  const genres: string[] = [];

  for (const part of parts) {
    const mapped = mapPartToGenre(part);
    if (!mapped) continue;
    genres.push(mapped);
  }

  return [...new Set(genres)];
}

function inferFromDescription(description: string): {
  fictionType: FictionType;
  genres: string[];
} | null {
  const genres: string[] = [];
  let nonfictionSignals = 0;
  let fictionSignals = 0;

  for (const hint of DESCRIPTION_GENRE_HINTS) {
    if (hint.pattern.test(description)) {
      genres.push(hint.genre);
      if (hint.type === "Non-Fiction") nonfictionSignals++;
      else fictionSignals++;
    }
  }

  if (!genres.length) {
    const lower = description.toLowerCase();
    if (/\bnon[- ]?fiction\b/.test(lower)) {
      return { fictionType: "Non-Fiction", genres: [] };
    }
    if (/\bnovel\b/.test(lower) && !/\bnon[- ]?fiction\b/.test(lower)) {
      return { fictionType: "Fiction", genres: [] };
    }
    return null;
  }

  const fictionType =
    nonfictionSignals > fictionSignals ? "Non-Fiction" : "Fiction";

  return { fictionType, genres: [...new Set(genres)] };
}

function inferFromTitle(
  title: string,
  author?: string | null,
): { fictionType: FictionType; genres: string[] } | null {
  const combined = `${title} ${author ?? ""}`.toLowerCase();

  const rules: {
    pattern: RegExp;
    type: FictionType;
    genres: string[];
  }[] = [
    {
      pattern: /american sniper|chris kyle/,
      type: "Non-Fiction",
      genres: ["Biography", "Military", "War"],
    },
    {
      pattern: /parasitic mind|gad saad/,
      type: "Non-Fiction",
      genres: ["Politics", "Psychology"],
    },
    {
      pattern: /great gatsby|f\.?\s*scott fitzgerald/,
      type: "Fiction",
      genres: ["Classics"],
    },
    {
      pattern: /1984|george orwell/,
      type: "Fiction",
      genres: ["Dystopian", "Classics"],
    },
    {
      pattern: /sapiens|yuval/,
      type: "Non-Fiction",
      genres: ["History", "Science"],
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(combined)) {
      return { fictionType: rule.type, genres: rule.genres };
    }
  }

  return null;
}

/** [Fiction|Non-Fiction, ...specific genres] — never uses "Literature" as filler. */
export function getDisplayCategories(
  rawCategories: string[],
  description?: string | null,
  title?: string | null,
  author?: string | null,
  subtitle?: string | null,
): string[] {
  const cleanedRaw = stripLazyApiCategories(rawCategories);
  const parts = splitParts(cleanedRaw.length ? cleanedRaw : rawCategories);
  let fictionType = detectFictionType(parts);
  let genres = extractGenreTags(parts);

  const textFields = { title, subtitle, description, author };

  genres = resolveInferredGenresOverGeneric(rawCategories, genres, textFields);

  if (description) {
    const inferred = inferFromDescription(description);
    if (inferred) {
      if (!fictionType) fictionType = inferred.fictionType;
      for (const g of inferred.genres) {
        if (!genres.includes(g)) genres.push(g);
      }
    }
  }

  if ((!fictionType || genres.length === 0) && title) {
    const fromTitle = inferFromTitle(title, author);
    if (fromTitle) {
      if (!fictionType) fictionType = fromTitle.fictionType;
      for (const g of fromTitle.genres) {
        if (!genres.includes(g)) genres.push(g);
      }
    }
  }

  if (genres.length === 0 || genres.every((g) => isGenericDisplayGenre(g))) {
    genres = inferGenresFromBookText(textFields);
  }

  if (!fictionType) {
    const nonfictionGenres = new Set([
      "Biography",
      "Autobiography",
      "Memoir",
      "History",
      "Military",
      "War",
      "Psychology",
      "Politics",
      "Philosophy",
      "True Crime",
      "Self-Help",
      "Science",
      "Business",
      "Economics",
      "Health",
      "Religion",
      "Education",
      "Journalism",
      "Law",
      "Medicine",
      "Social Science",
    ]);
    if (genres.some((g) => nonfictionGenres.has(g))) {
      fictionType = "Non-Fiction";
    }
  }

  genres = genres.filter(
    (g) =>
      g !== "Literature" &&
      g !== "General" &&
      g !== fictionType &&
      !isGenericDisplayGenre(g),
  );

  if (
    needsGenreInferenceFallback(rawCategories, genres) &&
    inferGenresFromBookText(textFields).length > 0
  ) {
    genres = inferGenresFromBookText(textFields);
  }

  if (!fictionType) fictionType = "Fiction";

  return finalizeCategoryTags(fictionType, genres);
}

/** Enforce min 1 and max 3 specific genre tags after Fiction/Non-Fiction. */
export function finalizeCategoryTags(
  fictionType: FictionType,
  genres: string[],
): string[] {
  const cleaned = [
    ...new Set(
      genres.filter(
        (g) =>
          g !== fictionType &&
          g !== "Literature" &&
          g !== "General" &&
          g !== "Fiction" &&
          g !== "Non-Fiction",
      ),
    ),
  ].slice(0, MAX_GENRE_TAGS);

  const genreTags =
    cleaned.length > 0
      ? cleaned
      : [
          fictionType === "Non-Fiction"
            ? FALLBACK_NONFICTION_GENRE
            : FALLBACK_FICTION_GENRE,
        ];

  return [fictionType, ...genreTags.slice(0, MAX_GENRE_TAGS)];
}

function finalizeDisplayCategories(tags: string[]): string[] {
  const fictionType: FictionType =
    tags[0] === "Non-Fiction" ? "Non-Fiction" : "Fiction";
  return finalizeCategoryTags(fictionType, tags.slice(1));
}

function isStalePlaceholder(categories: string[]): boolean {
  if (!categories.length) return true;
  const type = categories[0];
  if (type !== "Fiction" && type !== "Non-Fiction") return true;
  const genres = categories
    .slice(1)
    .filter((g) => !DEPRECATED_GENRES.has(g));
  return genres.length === 0;
}

export function isNormalizedCategories(categories: string[]): boolean {
  if (!categories.length) return false;
  return categories[0] === "Fiction" || categories[0] === "Non-Fiction";
}

const DEPRECATED_GENRES = new Set(["Literature", "General"]);

export function looksLikeRawApiCategories(categories: string[]): boolean {
  return categories.some(
    (c) =>
      c.includes("/") ||
      c.includes(" & ") ||
      /\b(biography|autobiography|political science|social science)\b/i.test(c),
  );
}

/**
 * Resolve display tags from raw API categories (preferred) or stored values.
 */
export function resolveBookCategoryTags(
  apiCategories: string[] | undefined,
  storedCategories: string[],
  description?: string | null,
  title?: string | null,
  author?: string | null,
  subtitle?: string | null,
): string[] {
  const rawApi = ensureBookCategories(apiCategories ?? []);
  const stored = ensureBookCategories(storedCategories);
  const raw = rawApi.length
    ? rawApi
    : looksLikeRawApiCategories(stored)
      ? stored
      : [];

  return getDisplayCategories(raw, description, title, author, subtitle);
}

/**
 * Single pipeline: raw API strings → [Fiction|Non-Fiction, ...genre tags].
 */
export function normalizeBookCategories(
  rawOrStored: string[],
  description?: string | null,
  title?: string | null,
  author?: string | null,
  subtitle?: string | null,
): string[] {
  return resolveBookCategoryTags(
    undefined,
    rawOrStored,
    description,
    title,
    author,
    subtitle,
  );
}

export function categoriesFromApi(
  apiCategories: string[],
  description?: string | null,
  title?: string | null,
  author?: string | null,
  subtitle?: string | null,
): string[] {
  return resolveBookCategoryTags(
    apiCategories,
    [],
    description,
    title,
    author,
    subtitle,
  );
}

export function categoriesNeedUpdate(
  stored: string[],
  rawApi: string[],
  description?: string | null,
): boolean {
  const normalized = normalizeBookCategories(
    rawApi.length ? rawApi : stored,
    description,
  );
  return normalized.join("|") !== stored.join("|");
}

export function ensureBookCategories(categories: string[]): string[] {
  return categories.map((c) => c.trim()).filter(Boolean);
}

export function needsCategoryRefresh(categories: string[]): boolean {
  if (!categories.length) return true;
  if (categories.length === 1 && categories[0] === "Fiction") return true;
  return false;
}

export function hasUsableApiCategories(categories: string[]): boolean {
  return categories.some((c) => c.trim().length > 0);
}
