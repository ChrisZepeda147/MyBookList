/**
 * Intercepts lazy Google Books categories ("Fiction / General") and replaces them
 * with genres inferred from title, subtitle, and description.
 */

export interface BookTextForGenreInference {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  author?: string | null;
}

const LAZY_API_PARTS = new Set([
  "general",
  "literary",
  "literature",
  "fiction",
  "nonfiction",
  "non-fiction",
]);

export const GENERIC_DISPLAY_GENRES = new Set([
  "General Fiction",
  "General Non-Fiction",
  "General",
  "Literature",
]);

type GenreRule = {
  patterns: RegExp[];
  genre: string;
};

/** Keyword groups — any match in title/description maps to a display genre. */
const GENRE_SIGNAL_RULES: GenreRule[] = [
  {
    patterns: [
      /\bromance\b/i,
      /\blove story\b/i,
      /\blove\b/i,
      /\brelationship\b/i,
      /\brelationships\b/i,
      /\bin love\b/i,
      /\bheartbreak\b/i,
      /\bunrequited love\b/i,
    ],
    genre: "Romance",
  },
  {
    patterns: [
      /\bdystopi(an|a)\b/i,
      /\bpost[- ]apocalyptic\b/i,
      /\btotalitarian\b/i,
      /\boppressive (regime|society|government)\b/i,
      /\bsurveillance state\b/i,
    ],
    genre: "Dystopian",
  },
  {
    patterns: [
      /\bscience fiction\b/i,
      /\bsci[- ]?fi\b/i,
      /\bouter space\b/i,
      /\bspace (station|travel|colony|exploration)\b/i,
      /\balien(s)?\b/i,
      /\binterstellar\b/i,
      /\bterraforming\b/i,
      /\bandroid(s)?\b/i,
      /\brobot(s)?\b/i,
    ],
    genre: "Sci-Fi",
  },
  {
    patterns: [
      /\bthriller\b/i,
      /\bmurder\b/i,
      /\bhomicide\b/i,
      /\bsuspense\b/i,
      /\bpsychological suspense\b/i,
      /\bserial killer\b/i,
      /\bwhodunit\b/i,
    ],
    genre: "Thriller",
  },
  {
    patterns: [/\bmystery\b/i, /\bdetective\b/i, /\binvestigation\b/i],
    genre: "Mystery",
  },
  {
    patterns: [/\bhorror\b/i, /\bhaunted\b/i, /\bsupernatural\b/i],
    genre: "Horror",
  },
  {
    patterns: [/\bfantasy\b/i, /\bmagic(al)?\b/i, /\bdragon(s)?\b/i],
    genre: "Fantasy",
  },
  {
    patterns: [/\bmanga\b/i, /\banime\b/i],
    genre: "Manga",
  },
  {
    patterns: [/\bgraphic novel\b/i, /\bcomics?\b/i],
    genre: "Graphic Novel",
  },
  {
    patterns: [/\blight novel\b/i],
    genre: "Light Novel",
  },
  {
    patterns: [/\byoung adult\b/i, /\bteen fiction\b/i, /\bcoming[- ]of[- ]age\b/i],
    genre: "Young Adult",
  },
  {
    patterns: [/\badventure\b/i],
    genre: "Adventure",
  },
  {
    patterns: [/\bpoetry\b/i],
    genre: "Poetry",
  },
  {
    patterns: [/\bdrama\b/i],
    genre: "Drama",
  },
  {
    patterns: [/\btrue crime\b/i],
    genre: "True Crime",
  },
  {
    patterns: [/\bself[- ]help\b/i],
    genre: "Self-Help",
  },
  {
    patterns: [/\bbiograph(y|ical)\b/i],
    genre: "Biography",
  },
  {
    patterns: [/\bautobiograph(y|ical)\b/i],
    genre: "Autobiography",
  },
  {
    patterns: [/\bmemoir\b/i],
    genre: "Memoir",
  },
  {
    patterns: [/\bhistory\b/i, /\bhistorical\b/i],
    genre: "History",
  },
  {
    patterns: [/\bwar\b/i, /\bmilitary\b/i],
    genre: "War",
  },
  {
    patterns: [/\bpsycholog(y|ical)\b/i],
    genre: "Psychology",
  },
  {
    patterns: [/\bpolitic(s|al)\b/i],
    genre: "Politics",
  },
  {
    patterns: [/\bphilosoph(y|ical)\b/i],
    genre: "Philosophy",
  },
  {
    patterns: [/\bbusiness\b/i],
    genre: "Business",
  },
  {
    patterns: [/\bclassics?\b/i],
    genre: "Classics",
  },
];

/** Well-known titles Google often mis-tags as General Fiction. */
const KNOWN_TITLE_GENRES: {
  pattern: RegExp;
  genres: string[];
}[] = [
  { pattern: /\bit ends with us\b/i, genres: ["Romance", "Drama"] },
  {
    pattern: /\bi who have never known men\b|\bje n.ai jamais connu les hommes\b/i,
    genres: ["Dystopian", "Sci-Fi"],
  },
  { pattern: /\bthe great gatsby\b/i, genres: ["Classics", "Drama"] },
  { pattern: /\b1984\b/i, genres: ["Dystopian", "Classics"] },
  { pattern: /\bbrave new world\b/i, genres: ["Dystopian", "Sci-Fi"] },
  { pattern: /\bthe handmaid.s tale\b/i, genres: ["Dystopian", "Drama"] },
  { pattern: /\bproject hail mary\b/i, genres: ["Sci-Fi"] },
  { pattern: /\bthe martian\b/i, genres: ["Sci-Fi", "Adventure"] },
  { pattern: /\bgone girl\b/i, genres: ["Thriller", "Mystery"] },
  { pattern: /\bthe silent patient\b/i, genres: ["Thriller", "Mystery"] },
  { pattern: /\bwhere the crawdads sing\b/i, genres: ["Mystery", "Drama"] },
  { pattern: /\bthe seven husbands of evelyn hugo\b/i, genres: ["Romance", "Drama"] },
  { pattern: /\bbeach read\b/i, genres: ["Romance"] },
  { pattern: /\bpeople we meet on vacation\b/i, genres: ["Romance"] },
];

const TEXT_FIELD_WEIGHTS: {
  key: keyof BookTextForGenreInference;
  weight: number;
}[] = [
  { key: "title", weight: 4 },
  { key: "subtitle", weight: 3 },
  { key: "description", weight: 2 },
];

function splitApiParts(categories: string[]): string[] {
  return categories
    .flatMap((raw) => raw.split("/").map((part) => part.trim().toLowerCase()))
    .filter(Boolean);
}

export function isGenericDisplayGenre(genre: string): boolean {
  return GENERIC_DISPLAY_GENRES.has(genre);
}

export function hasLazyGeneralApiCategories(categories: string[]): boolean {
  if (!categories.length) return true;

  const parts = splitApiParts(categories);
  if (!parts.length) return true;

  const specificParts = parts.filter(
    (part) =>
      !LAZY_API_PARTS.has(part) &&
      !part.includes("general") &&
      !part.includes("literary"),
  );

  if (specificParts.length > 0) return false;

  return parts.some(
    (part) =>
      part.includes("general") ||
      part.includes("literary") ||
      LAZY_API_PARTS.has(part),
  );
}

export function stripLazyApiCategories(categories: string[]): string[] {
  return categories
    .map((raw) =>
      raw
        .split("/")
        .map((part) => part.trim())
        .filter((part) => {
          const lower = part.toLowerCase();
          return (
            lower &&
            !LAZY_API_PARTS.has(lower) &&
            !lower.includes("general") &&
            !lower.includes("literary")
          );
        })
        .join(" / "),
    )
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreGenresFromText(
  text: string | null | undefined,
  weight: number,
  scores: Map<string, number>,
): void {
  if (!text?.trim() || weight <= 0) return;

  for (const rule of GENRE_SIGNAL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      scores.set(rule.genre, (scores.get(rule.genre) ?? 0) + weight);
    }
  }
}

export function inferGenresFromKnownTitle(
  title?: string | null,
  author?: string | null,
): string[] {
  const combined = `${title ?? ""} ${author ?? ""}`.trim();
  if (!combined) return [];

  for (const entry of KNOWN_TITLE_GENRES) {
    if (entry.pattern.test(combined)) {
      return [...entry.genres];
    }
  }

  return [];
}

/** Scan title, subtitle, and description with title-weighted keyword matching. */
export function inferGenresFromBookText(
  fields: BookTextForGenreInference,
): string[] {
  const scores = new Map<string, number>();

  for (const { key, weight } of TEXT_FIELD_WEIGHTS) {
    scoreGenresFromText(fields[key], weight, scores);
  }

  const known = inferGenresFromKnownTitle(fields.title, fields.author);
  for (const genre of known) {
    scores.set(genre, (scores.get(genre) ?? 0) + 10);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
}

/**
 * When API genres are lazy/generic, text-inferred genres take priority.
 * Otherwise merge inferred genres ahead of any specific API genres.
 */
export function resolveInferredGenresOverGeneric(
  apiCategories: string[],
  existingGenres: string[],
  fields: BookTextForGenreInference,
): string[] {
  const cleanedApiGenres = existingGenres.filter(
    (genre) => !isGenericDisplayGenre(genre),
  );
  const inferred = inferGenresFromBookText(fields);
  const apiIsLazy = hasLazyGeneralApiCategories(apiCategories);
  const onlyGeneric =
    cleanedApiGenres.length === 0 ||
    existingGenres.every((genre) => isGenericDisplayGenre(genre));

  if (inferred.length > 0 && (apiIsLazy || onlyGeneric)) {
    return inferred;
  }

  if (inferred.length > 0) {
    return [...new Set([...inferred, ...cleanedApiGenres])];
  }

  return cleanedApiGenres.length > 0 ? cleanedApiGenres : existingGenres;
}

/** True when display tags would fall back to a generic placeholder. */
export function needsGenreInferenceFallback(
  apiCategories: string[],
  genres: string[],
): boolean {
  return (
    hasLazyGeneralApiCategories(apiCategories) ||
    genres.length === 0 ||
    genres.every((genre) => isGenericDisplayGenre(genre))
  );
}
