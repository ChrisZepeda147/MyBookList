import type { BookEntry, BookSearchResult } from "@/lib/types";
import { cleanDescription, ensureBookDescription, hasRealDescription } from "@/lib/book-descriptions";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getGoogleBooksApiKey, withGoogleBooksApiKey } from "@/lib/google-books-api-key";
import {
  isGoogleBooksCircuitOpen,
  tripGoogleBooksCircuit,
} from "@/lib/google-books-circuit";
import { isRateLimitStatus } from "@/lib/google-books-errors";
import { resolveBookCategoryTags } from "@/lib/categories";
import { bookHasDisplayableCover, normalizeCoverUrl } from "@/lib/cover-url";
import {
  mapGoogleVolume,
  normalizeTitle,
  onlyWithCover,
  googleVolumeHasThumbnail,
  primaryAuthor,
  sortEditionsForDisplay,
  titlesMatch,
} from "@/lib/google-books-client";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API = "https://openlibrary.org/search.json";
/** Per upstream catalog request while building recommendations. */
const RECOMMENDATION_FETCH_TIMEOUT_MS = 3500;
const RECOMMENDATION_FETCH_CONCURRENCY = 5;

type RecommendationQueryPlan = {
  googleQuery: string;
  openLibraryQuery: string;
  era?: "recent" | "established";
};

async function mapInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export const MIN_RECOMMENDATIONS = 8;
/** Internal fetch pool — UI displays MIN_RECOMMENDATIONS; extras support dismiss replacement. */
export const MAX_RECOMMENDATIONS = 12;
/** Initial API response — extras load on dismiss via /recommendations/next. */
const INITIAL_RECOMMENDATION_TARGET = MIN_RECOMMENDATIONS;
const MIN_RATED_FOR_PERSONALIZED = 1;
const RECENT_YEARS_BACK = 10;
const HISTORY_SEED_COUNT = 4;

/** Large pool of acclaimed classics — a random subset is shown each load. */
const CLASSICS_POOL: ReadonlyArray<{ title: string; author: string }> = [
  { title: "To Kill a Mockingbird", author: "Harper Lee" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  { title: "Fahrenheit 451", author: "Ray Bradbury" },
  { title: "The Grapes of Wrath", author: "John Steinbeck" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger" },
  { title: "The Road", author: "Cormac McCarthy" },
  { title: "1984", author: "George Orwell" },
  { title: "Pride and Prejudice", author: "Jane Austen" },
  { title: "Moby-Dick", author: "Herman Melville" },
  { title: "Beloved", author: "Toni Morrison" },
  { title: "The Scarlet Letter", author: "Nathaniel Hawthorne" },
  { title: "Invisible Man", author: "Ralph Ellison" },
  { title: "Slaughterhouse-Five", author: "Kurt Vonnegut" },
  { title: "Their Eyes Were Watching God", author: "Zora Neale Hurston" },
  { title: "The Sun Also Rises", author: "Ernest Hemingway" },
  { title: "Brave New World", author: "Aldous Huxley" },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez" },
  { title: "The Bell Jar", author: "Sylvia Plath" },
  { title: "Catch-22", author: "Joseph Heller" },
  { title: "On the Road", author: "Jack Kerouac" },
  { title: "East of Eden", author: "John Steinbeck" },
  { title: "A Tree Grows in Brooklyn", author: "Betty Smith" },
  { title: "The Age of Innocence", author: "Edith Wharton" },
  { title: "Song of Solomon", author: "Toni Morrison" },
  { title: "Blood Meridian", author: "Cormac McCarthy" },
  { title: "White Teeth", author: "Zadie Smith" },
  { title: "The Color Purple", author: "Alice Walker" },
  { title: "Revolutionary Road", author: "Richard Yates" },
];

const TRENDING_QUERIES = [
  "fiction bestseller",
  "science fiction",
  "mystery thriller",
  "romance novel",
  "fantasy adventure",
  "historical fiction",
  "biography memoir",
  "true crime",
];

const RECENT_DISCOVERY_QUERIES = [
  "bestseller fiction",
  "award winning novel",
  "book club pick",
  "critically acclaimed debut",
  "literary fiction",
  "popular science",
  "memoir bestseller",
];

/** Map display genre tags → Google Books subject queries. */
const GENRE_TO_SUBJECT: Record<string, string> = {
  Biography: "biography",
  Autobiography: "biography",
  Memoir: "memoir",
  Military: "military",
  War: "war",
  History: "history",
  Politics: "political science",
  Psychology: "psychology",
  Philosophy: "philosophy",
  "True Crime": "true crime",
  "Self-Help": "self-help",
  Science: "science",
  Business: "business",
  Economics: "economics",
  Health: "health",
  Religion: "religion",
  Education: "education",
  Journalism: "journalism",
  Law: "law",
  Medicine: "medicine",
  "Social Science": "social science",
  "Sci-Fi": "science fiction",
  "Historical Fiction": "historical fiction",
  "Young Adult": "young adult fiction",
  Romance: "romance",
  Mystery: "mystery",
  Thriller: "thriller",
  Fantasy: "fantasy",
  Horror: "horror",
  Dystopian: "dystopian",
  Adventure: "adventure",
  Classics: "classic literature",
  Drama: "drama",
  Poetry: "poetry",
  Comics: "comics",
  "Graphic Novel": "graphic novels",
  Literature: "literary fiction",
  Nature: "nature",
  Travel: "travel",
  Cooking: "cooking",
  Sports: "sports",
  Music: "music",
  Art: "art",
  Humor: "humor",
};

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface GoogleBooksResponse {
  items?: GoogleVolume[];
  error?: { message?: string };
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_sentence?: string[];
  number_of_pages_median?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

/** Pick random seeds from full library history for wider genre coverage. */
function pickRandomHistorySeeds(
  userBooks: BookEntry[],
  seed: string,
  count = HISTORY_SEED_COUNT,
): BookEntry[] {
  const seen = new Set<string>();
  const pool: BookEntry[] = [];

  for (const book of userBooks) {
    const key = normalizeTitle(book.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pool.push(book);
  }

  if (pool.length === 0) return [];
  return seededShuffle(pool, `${seed}-history`).slice(0, Math.min(count, pool.length));
}

function parsePublicationYear(book: BookSearchResult): number | null {
  const raw = book.publishedDate?.trim();
  if (!raw) return null;
  const year = parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function isRecentRelease(
  book: BookSearchResult,
  yearsBack = RECENT_YEARS_BACK,
): boolean {
  const year = parsePublicationYear(book);
  if (year == null) return false;
  return year >= new Date().getFullYear() - yearsBack;
}

function recentAfterYear(yearsBack = RECENT_YEARS_BACK): number {
  return new Date().getFullYear() - yearsBack;
}

function blendRecommendations(
  recent: BookSearchResult[],
  established: BookSearchResult[],
  profile: TasteProfile,
  seed: string,
  limit: number,
): BookSearchResult[] {
  const recentPool = sortByTaste(
    seededShuffle(dedupeByNormalizedTitle(recent), `${seed}-recent`),
    profile,
  );
  const establishedPool = sortByTaste(
    seededShuffle(dedupeByNormalizedTitle(established), `${seed}-classic`),
    profile,
  );

  const recentSlots = Math.max(2, Math.ceil(limit / 2));
  const establishedSlots = limit - recentSlots;
  const picked = [
    ...recentPool.slice(0, recentSlots),
    ...establishedPool.slice(0, establishedSlots),
  ];

  const used = new Set(
    picked.map((book) => normalizeTitle(book.title)).filter(Boolean),
  );

  for (const book of [...recentPool.slice(recentSlots), ...establishedPool.slice(establishedSlots)]) {
    const key = normalizeTitle(book.title);
    if (!key || used.has(key)) continue;
    used.add(key);
    picked.push(book);
    if (picked.length >= limit) break;
  }

  return seededShuffle(picked, `${seed}-blend`).slice(0, limit);
}

function pushUniqueRecommendations(
  target: BookSearchResult[],
  batch: BookSearchResult[],
  seen: Set<string>,
  limit: number,
): void {
  for (const book of batch) {
    if (target.length >= limit) return;
    const key = normalizeTitle(book.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    target.push(book);
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let state = hashString(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) | 0;
    const j = Math.abs(state) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mapGoogleItem(item: GoogleVolume): BookSearchResult | null {
  if (!googleVolumeHasThumbnail(item)) return null;

  const mapped = mapGoogleVolume(item);
  if (!bookHasDisplayableCover(mapped, "list")) return null;

  const apiCategories = mapped.categories;
  return {
    ...mapped,
    apiCategories,
    categories: resolveBookCategoryTags(
      apiCategories,
      mapped.categories,
      mapped.description,
      mapped.title,
      mapped.author,
      mapped.subtitle,
    ),
  };
}

async function mapOpenLibraryDocWithDescription(
  doc: OpenLibraryDoc,
): Promise<BookSearchResult | null> {
  if (!doc.cover_i) return null;

  const authorName = doc.author_name?.join(", ") ?? "Unknown Author";
  const title = doc.title ?? "Unknown Title";
  const description = ensureBookDescription(
    cleanDescription(doc.first_sentence?.join(" ")) ||
      `A highly regarded work by ${authorName}.`,
  );

  const id = doc.key?.replace(/^\//, "") ?? crypto.randomUUID();
  const pages = doc.number_of_pages_median ?? null;
  const coverUrl = normalizeCoverUrl(
    `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
  );
  if (!coverUrl) return null;

  return {
    id: `ol-${id}`,
    title: doc.title ?? "Unknown Title",
    author: doc.author_name?.join(", ") ?? "Unknown Author",
    coverUrl,
    description,
    pageCount: pages && pages > 0 ? pages : null,
    categories: resolveBookCategoryTags(
      [],
      [],
      description,
      doc.title ?? "",
      doc.author_name?.join(", ") ?? "",
    ),
    editionLabel: pages && pages > 0 ? `${pages} pages` : "Open Library",
  };
}

function hasCover(book: BookSearchResult): boolean {
  return bookHasDisplayableCover(book, "list");
}

function hasDescription(book: BookSearchResult): boolean {
  return hasRealDescription(book.description);
}

function isRecommendable(book: BookSearchResult): boolean {
  return hasCover(book) && hasDescription(book);
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function onlyRecommendable(books: BookSearchResult[]): BookSearchResult[] {
  return books.filter(isRecommendable);
}

function dedupeByNormalizedTitle(
  books: BookSearchResult[],
): BookSearchResult[] {
  const seen = new Map<string, BookSearchResult>();
  for (const book of books) {
    const key = normalizeTitle(book.title);
    if (!key) continue;
    const existing = seen.get(key);
    if (
      !existing ||
      (book.pageCount ?? 0) > (existing.pageCount ?? 0) ||
      (book.coverUrl && !existing.coverUrl)
    ) {
      seen.set(key, book);
    }
  }
  return [...seen.values()];
}

function isInLibrary(book: BookSearchResult, userBooks: BookEntry[]): boolean {
  const titleKey = normalizeTitle(book.title);
  const authorKey = primaryAuthor(book.author).toLowerCase();

  return userBooks.some((b) => {
    if (b.googleBooksId && book.id === b.googleBooksId) return true;
    if (normalizeTitle(b.title) === titleKey) return true;
    if (
      primaryAuthor(b.author).toLowerCase() === authorKey &&
      normalizeTitle(b.title) === titleKey
    ) {
      return true;
    }
    return false;
  });
}

function genresForBook(book: BookEntry): string[] {
  const tags = resolveBookCategoryTags(
    book.apiCategories,
    book.categories,
    book.description,
    book.title,
    book.author,
    book.subtitle,
  );
  const genres = tags.filter((t) => t !== "Fiction" && t !== "Non-Fiction");

  const subjects = genres
    .map((g) => GENRE_TO_SUBJECT[g] ?? g.toLowerCase())
    .filter(Boolean);

  for (const raw of book.apiCategories ?? []) {
    for (const part of raw.split("/")) {
      const trimmed = part.trim();
      const mapped =
        GENRE_TO_SUBJECT[trimmed] ??
        Object.entries(GENRE_TO_SUBJECT).find(([key]) =>
          trimmed.toLowerCase().includes(key.toLowerCase()),
        )?.[1];
      if (mapped) subjects.push(mapped);
    }
  }

  const fictionType = tags[0];
  if (fictionType === "Non-Fiction") subjects.push("nonfiction");
  if (fictionType === "Fiction") subjects.push("fiction");

  return [...new Set(subjects)];
}

function subjectsForSearchResult(book: BookSearchResult): string[] {
  const tags = resolveBookCategoryTags(
    book.apiCategories,
    book.categories,
    book.description,
    book.title,
    book.author,
    book.subtitle,
  );
  return tags
    .filter((t) => t !== "Fiction" && t !== "Non-Fiction")
    .map((g) => GENRE_TO_SUBJECT[g] ?? g.toLowerCase());
}

interface TasteProfile {
  weightedSubjects: Map<string, number>;
  anchorTitles: string[];
}

function buildTasteProfile(ratedBooks: BookEntry[]): TasteProfile {
  const weightedSubjects = new Map<string, number>();
  const anchorTitles: string[] = [];

  for (const book of ratedBooks) {
    const weight = book.rating ?? 0;
    anchorTitles.push(book.title);
    for (const subject of genresForBook(book)) {
      weightedSubjects.set(
        subject,
        (weightedSubjects.get(subject) ?? 0) + weight,
      );
    }
  }

  return { weightedSubjects, anchorTitles };
}

function tasteMatchScore(
  book: BookSearchResult,
  profile: TasteProfile,
): number {
  let score = 0;
  for (const subject of subjectsForSearchResult(book)) {
    score += profile.weightedSubjects.get(subject) ?? 0;
  }
  return score;
}

function topTasteSubjects(profile: TasteProfile, limit = 8): string[] {
  return [...profile.weightedSubjects.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([subject]) => subject);
}

function ratedBooksFingerprint(books: BookEntry[]): string {
  return books
    .filter((b) => b.rating != null)
    .map((b) => `${b.id}:${b.rating}`)
    .sort()
    .join("|");
}

function sortByTaste(
  books: BookSearchResult[],
  profile: TasteProfile,
): BookSearchResult[] {
  return [...books].sort(
    (a, b) => tasteMatchScore(b, profile) - tasteMatchScore(a, profile),
  );
}

function subjectQueryForGenre(subject: string): string {
  return `subject:"${subject}"`;
}

function authorQueryFor(author: string): string {
  return `inauthor:"${primaryAuthor(author)}"`;
}

function intitleAuthorQuery(title: string, author: string): string {
  return `intitle:"${title}" inauthor:"${primaryAuthor(author)}"`;
}

async function fetchClassicBook(
  title: string,
  author: string,
): Promise<BookSearchResult | null> {
  const authorName = primaryAuthor(author);

  const [openLib, google] = await Promise.all([
    fetchOpenLibraryQuery(`${title} ${authorName}`, 6),
    isGoogleBooksCircuitOpen()
      ? Promise.resolve([] as BookSearchResult[])
      : fetchGoogleQuery(intitleAuthorQuery(title, author), 6),
  ]);

  const olMatch =
    openLib.find((book) => titlesMatch(book.title, title)) ?? openLib[0];
  if (olMatch && bookHasDisplayableCover(olMatch, "list")) return olMatch;

  const match =
    google.find((book) => titlesMatch(book.title, title)) ?? google[0];
  if (match && bookHasDisplayableCover(match, "list")) {
    return {
      ...match,
      description: ensureBookDescription(
        match.description ||
          `A critically acclaimed novel by ${authorName}.`,
      ),
    };
  }

  return null;
}

/** Fetch a shuffled batch of classics that have cover art (fallback filler only). */
export async function fetchFallbackClassics(
  userBooks: BookEntry[],
  target = 4,
): Promise<BookSearchResult[]> {
  const shuffled = shuffleArray([...CLASSICS_POOL]);

  const candidates = shuffled.filter((classic) => {
    const titleKey = normalizeTitle(classic.title);
    if (!titleKey) return false;
    return !userBooks.some((b) => normalizeTitle(b.title) === titleKey);
  });

  const results: BookSearchResult[] = [];
  const usedTitleKeys = new Set<string>();
  const batchSize = 3;

  for (
    let offset = 0;
    offset < candidates.length && results.length < target;
    offset += batchSize
  ) {
    const chunk = candidates.slice(offset, offset + batchSize);
    const settled = await Promise.allSettled(
      chunk.map((classic) => fetchClassicBook(classic.title, classic.author)),
    );

    for (const outcome of settled) {
      if (results.length >= target) break;
      if (outcome.status !== "fulfilled") continue;

      const book = outcome.value;
      if (!book || !bookHasDisplayableCover(book, "list")) continue;
      if (isInLibrary(book, userBooks)) continue;

      const titleKey = normalizeTitle(book.title);
      if (!titleKey || usedTitleKeys.has(titleKey)) continue;

      usedTitleKeys.add(titleKey);
      results.push(book);
    }
  }

  return onlyWithCover(results);
}

/** @deprecated Covers load async — use loading state instead of coverless seeds. */
export function getFallbackClassicsSeed(): BookSearchResult[] {
  return [];
}

async function fetchGoogleQuery(
  query: string,
  maxResults = 40,
): Promise<BookSearchResult[]> {
  if (isGoogleBooksCircuitOpen()) {
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
    printType: "books",
    orderBy: "relevance",
    projection: "full",
  });

  try {
    const response = await fetchWithTimeout(
      withGoogleBooksApiKey(`${GOOGLE_BOOKS_API}?${params.toString()}`),
      {
        headers: { Accept: "application/json" },
        timeoutMs: RECOMMENDATION_FETCH_TIMEOUT_MS,
      },
    );

    if (isRateLimitStatus(response.status)) {
      tripGoogleBooksCircuit();
      console.warn(
        "[recommendations] Google Books rate limited — Open Library only for 1 hour.",
      );
      return [];
    }

    if (!response.ok) return [];

    const data = (await response.json()) as GoogleBooksResponse;
    return onlyWithCover(
      onlyRecommendable(
        dedupeByNormalizedTitle(
          sortEditionsForDisplay(
            (data.items ?? [])
              .filter(googleVolumeHasThumbnail)
              .map(mapGoogleItem)
              .filter((book): book is BookSearchResult => book !== null),
          ),
        ),
      ),
    );
  } catch {
    return [];
  }
}

async function fetchOpenLibraryQuery(
  query: string,
  limit = 25,
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: "key,title,author_name,cover_i,first_sentence,number_of_pages_median",
  });

  try {
    const response = await fetchWithTimeout(
      `${OPEN_LIBRARY_API}?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        timeoutMs: RECOMMENDATION_FETCH_TIMEOUT_MS,
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as OpenLibraryResponse;
    const mapped = (
      await Promise.all(
        (data.docs ?? []).map((doc) => mapOpenLibraryDocWithDescription(doc)),
      )
    ).filter((book): book is BookSearchResult => book !== null);
    return onlyWithCover(
      dedupeByNormalizedTitle(sortEditionsForDisplay(mapped)),
    );
  } catch {
    return [];
  }
}

async function fetchWithFallback(
  googleQuery: string,
  openLibraryQuery: string,
): Promise<BookSearchResult[]> {
  const [google, openLib] = await Promise.all([
    isGoogleBooksCircuitOpen()
      ? Promise.resolve([] as BookSearchResult[])
      : fetchGoogleQuery(googleQuery, 15),
    fetchOpenLibraryQuery(openLibraryQuery, 15),
  ]);

  return onlyWithCover(
    onlyRecommendable(dedupeByNormalizedTitle([...google, ...openLib])),
  );
}

async function runRecommendationQueries(
  plans: RecommendationQueryPlan[],
  userBooks: BookEntry[],
  usedTitleKeys: Set<string>,
  onBatch: (batch: BookSearchResult[], plan: RecommendationQueryPlan) => void,
  stopWhen?: () => boolean,
): Promise<void> {
  for (let i = 0; i < plans.length; i += RECOMMENDATION_FETCH_CONCURRENCY) {
    if (stopWhen?.()) break;

    const chunk = plans.slice(i, i + RECOMMENDATION_FETCH_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((plan) =>
        fetchWithFallback(plan.googleQuery, plan.openLibraryQuery),
      ),
    );

    for (let j = 0; j < chunk.length; j++) {
      const plan = chunk[j]!;
      const batch = filterRecommendations(results[j]!, userBooks, usedTitleKeys);
      onBatch(batch, plan);
    }
  }
}

function filterRecommendations(
  books: BookSearchResult[],
  userBooks: BookEntry[],
  usedTitleKeys: Set<string>,
): BookSearchResult[] {
  return books.filter((book) => {
    if (!hasCover(book)) return false;
    if (!isRecommendable(book)) return false;
    const titleKey = normalizeTitle(book.title);
    if (!titleKey || usedTitleKeys.has(titleKey)) return false;
    if (isInLibrary(book, userBooks)) return false;
    return true;
  });
}

/** Personalized picks from random history seeds — blends recent releases with established favorites. */
async function fetchBlendedRecommendations(
  historySeeds: BookEntry[],
  userBooks: BookEntry[],
  seed: string,
  profile: TasteProfile,
): Promise<BookSearchResult[]> {
  const usedTitleKeys = new Set<string>();
  const recentPool: BookSearchResult[] = [];
  const establishedPool: BookSearchResult[] = [];
  const afterYear = recentAfterYear();
  const plans: RecommendationQueryPlan[] = [];

  for (const book of historySeeds) {
    const subjects = genresForBook(book);
    const subject = subjects[0] ?? "fiction";
    const authorName = primaryAuthor(book.author);

    if (authorName && !isGoogleBooksCircuitOpen()) {
      plans.push({
        googleQuery: authorQueryFor(book.author),
        openLibraryQuery: authorName,
        era: "established",
      });
    }

    plans.push(
      {
        googleQuery: `${subjectQueryForGenre(subject)} bestseller after:${afterYear}`,
        openLibraryQuery: `${subject} bestseller`,
        era: "recent",
      },
      {
        googleQuery: `subject:"${subject}" classic literature`,
        openLibraryQuery: `${subject} classic`,
        era: "established",
      },
    );
  }

  for (const subject of topTasteSubjects(profile, 2)) {
    plans.push(
      {
        googleQuery: `${subjectQueryForGenre(subject)} bestseller after:${afterYear}`,
        openLibraryQuery: `${subject} bestseller`,
        era: "recent",
      },
      {
        googleQuery: `${subjectQueryForGenre(subject)} classic literature`,
        openLibraryQuery: `${subject} classic`,
        era: "established",
      },
    );
  }

  const hasEnough = () =>
    recentPool.length + establishedPool.length >= INITIAL_RECOMMENDATION_TARGET * 2;

  await runRecommendationQueries(
    plans,
    userBooks,
    usedTitleKeys,
    (batch, plan) => {
      const target = plan.era === "recent" ? recentPool : establishedPool;
      for (const rec of batch) {
        const key = normalizeTitle(rec.title);
        if (!key) continue;
        if (plan.era === "recent" && !isRecentRelease(rec)) continue;
        if (plan.era === "established" && isRecentRelease(rec)) continue;
        target.push(rec);
      }
    },
    hasEnough,
  );

  return blendRecommendations(
    recentPool,
    establishedPool,
    profile,
    seed,
    INITIAL_RECOMMENDATION_TARGET,
  );
}

async function fetchDiscoveryMix(
  userBooks: BookEntry[],
  seed: string,
): Promise<BookSearchResult[]> {
  const usedTitleKeys = new Set<string>();
  const recentPool: BookSearchResult[] = [];
  const establishedPool: BookSearchResult[] = [];
  const afterYear = recentAfterYear();
  const emptyProfile: TasteProfile = {
    weightedSubjects: new Map(),
    anchorTitles: [],
  };

  const recentQueries = seededShuffle(
    RECENT_DISCOVERY_QUERIES.map((q) => `${q} after:${afterYear}`),
    `${seed}-recent-discovery`,
  ).slice(0, 3);
  const trendingQueries = dailyQueries(seed).slice(0, 3);

  const plans: RecommendationQueryPlan[] = [
    ...recentQueries.map((q) => ({
      googleQuery: q,
      openLibraryQuery: q.replace(/after:\d+$/, "").trim(),
      era: "recent" as const,
    })),
    ...trendingQueries.map((q) => ({
      googleQuery: q,
      openLibraryQuery: q,
      era: "established" as const,
    })),
  ];

  const hasEnough = () =>
    recentPool.length + establishedPool.length >= INITIAL_RECOMMENDATION_TARGET;

  await runRecommendationQueries(
    plans,
    userBooks,
    usedTitleKeys,
    (batch, plan) => {
      const target = plan.era === "recent" ? recentPool : establishedPool;
      const filtered =
        plan.era === "recent"
          ? batch.filter(isRecentRelease)
          : batch;
      pushUniqueRecommendations(
        target,
        filtered,
        usedTitleKeys,
        INITIAL_RECOMMENDATION_TARGET,
      );
    },
    hasEnough,
  );

  if (establishedPool.length < INITIAL_RECOMMENDATION_TARGET / 2) {
    const classics = await fetchFallbackClassics(userBooks, 2);
    pushUniqueRecommendations(
      establishedPool,
      classics.filter((book) => !isInLibrary(book, userBooks)),
      usedTitleKeys,
      INITIAL_RECOMMENDATION_TARGET,
    );
  }

  return blendRecommendations(
    recentPool,
    establishedPool,
    emptyProfile,
    seed,
    INITIAL_RECOMMENDATION_TARGET,
  );
}

function dailyQueries(seed: string): string[] {
  return seededShuffle(TRENDING_QUERIES, seed);
}

async function ensureMinimumRecommendations(
  books: BookSearchResult[],
  userBooks: BookEntry[],
  seed: string,
  min = MIN_RECOMMENDATIONS,
  tasteQueries: string[] = [],
): Promise<BookSearchResult[]> {
  const usedTitleKeys = new Set(
    dedupeByNormalizedTitle(books)
      .filter((b) => !isInLibrary(b, userBooks))
      .map((b) => normalizeTitle(b.title)),
  );

  let pool = onlyRecommendable(
    dedupeByNormalizedTitle(
      books.filter((b) => !isInLibrary(b, userBooks)),
    ),
  );

  const fillQueries = [
    ...tasteQueries.map((s) => subjectQueryForGenre(s)),
    ...seededShuffle(TRENDING_QUERIES, `${seed}-fill`),
  ].slice(0, 6);

  const batches = await mapInParallel(
    fillQueries,
    RECOMMENDATION_FETCH_CONCURRENCY,
    async (q) => {
      if (pool.length >= min) return [];
      if (isGoogleBooksCircuitOpen() && q.includes("subject:")) return [];
      return filterRecommendations(
        await fetchWithFallback(q, q),
        userBooks,
        usedTitleKeys,
      );
    },
  );

  for (const more of batches) {
    if (pool.length >= min) break;
    for (const book of more) {
      if (!isRecommendable(book)) continue;
      const key = normalizeTitle(book.title);
      usedTitleKeys.add(key);
      pool.push(book);
    }
    pool = onlyRecommendable(dedupeByNormalizedTitle(pool));
  }

  return pool.slice(0, MAX_RECOMMENDATIONS);
}

export { BOOKS_API_UNAVAILABLE } from "@/lib/google-books-errors";
export { isGoogleBooksRateLimitError } from "@/lib/google-books-errors";

export type RecommendationMode = "personalized" | "trending";

export interface RecommendationResult {
  books: BookSearchResult[];
  mode: RecommendationMode;
  heading: string;
  subtitle: string;
  refreshedAt: string;
}

const REC_CACHE_KEY = "mybooklist_recommendations_cache_v10";

interface RecommendationCache {
  date: string;
  ratedFingerprint: string;
  result: RecommendationResult;
}

export function ratedBooksFingerprintForCache(books: BookEntry[]): string {
  return ratedBooksFingerprint(books);
}

export function readRecommendationCache(
  ratedFingerprint: string,
  userBooks: BookEntry[],
): RecommendationResult | null {
  const today = getTodayKey();
  const cached = loadRecommendationCache();

  if (
    cached?.date === today &&
    cached.ratedFingerprint === ratedFingerprint &&
    cached.result.books.length > 0
  ) {
    const filtered = onlyWithCover(
      dedupeByNormalizedTitle(
        cached.result.books.filter((b) => !isInLibrary(b, userBooks)),
      ),
    );
    if (filtered.length > 0) {
      return {
        ...cached.result,
        books: filtered.slice(0, MAX_RECOMMENDATIONS),
      };
    }
  }

  return null;
}

export function writeRecommendationCache(
  result: RecommendationResult,
  ratedFingerprint: string,
): void {
  saveRecommendationCache(result, ratedFingerprint);
}

function loadRecommendationCache(): RecommendationCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REC_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecommendationCache;
  } catch {
    return null;
  }
}

function saveRecommendationCache(
  result: RecommendationResult,
  ratedFingerprint: string,
): void {
  if (typeof window === "undefined") return;
  const withCovers = onlyWithCover(result.books);
  if (withCovers.length === 0) return;
  const cache: RecommendationCache = {
    date: getTodayKey(),
    ratedFingerprint,
    result: {
      ...result,
      books: withCovers,
    },
  };
  localStorage.setItem(REC_CACHE_KEY, JSON.stringify(cache));
}

function personalizedSubtitle(
  historySeeds: BookEntry[],
  tasteHints: string[],
): string {
  const tasteNote =
    tasteHints.length > 0 ? ` · Based on ${tasteHints.join(" & ")}` : "";
  const seedTitles = historySeeds.slice(0, 2).map((b) => b.title);

  if (seedTitles.length === 0) {
    return `A mix of recent releases and timeless favorites${tasteNote}`;
  }
  if (seedTitles.length === 1) {
    return `Inspired by your reading — including "${seedTitles[0]}"${tasteNote}`;
  }
  return `Inspired by your reading — including "${seedTitles[0]}" and "${seedTitles[1]}"${tasteNote}`;
}

export async function getRecommendations(
  userBooks: BookEntry[],
): Promise<RecommendationResult> {
  const today = getTodayKey();
  const ratedBooks = userBooks
    .filter((b) => b.rating != null && b.rating > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const hasPersonalizedTaste = ratedBooks.length >= MIN_RATED_FOR_PERSONALIZED;

  if (!getGoogleBooksApiKey()) {
    console.warn(
      "[recommendations] GOOGLE_BOOKS_API_KEY is not set — using Open Library where possible.",
    );
  }

  let raw: BookSearchResult[];
  let mode: RecommendationMode;
  let heading: string;
  let subtitle: string;

  const historySeeds = pickRandomHistorySeeds(userBooks, today);
  const profileSource =
    ratedBooks.length > 0
      ? [...historySeeds, ...ratedBooks]
      : historySeeds.length > 0
        ? historySeeds
        : userBooks;
  const tasteProfile = buildTasteProfile(
    profileSource.map((book) => ({
      ...book,
      rating: book.rating ?? 3,
    })),
  );
  const tasteQueries = topTasteSubjects(tasteProfile, 4);

  if (userBooks.length > 0) {
    raw = await fetchBlendedRecommendations(
      historySeeds.length > 0 ? historySeeds : userBooks.slice(0, HISTORY_SEED_COUNT),
      userBooks,
      today,
      tasteProfile,
    );
    mode = "personalized";
    heading = "Recommended for You";
    subtitle = hasPersonalizedTaste
      ? personalizedSubtitle(historySeeds, topTasteSubjects(tasteProfile, 2))
      : "Based on your reading history · Rate books for sharper picks";
  } else {
    raw = await fetchDiscoveryMix(userBooks, today);
    mode = "trending";
    heading = "Discover Your Next Read";
    subtitle =
      "Highly rated picks — new releases and modern favorites mixed with timeless classics";
  }

  let books = onlyWithCover(
    dedupeByNormalizedTitle(
      raw.filter((b) => !isInLibrary(b, userBooks)),
    ),
  ).slice(0, INITIAL_RECOMMENDATION_TARGET);

  if (books.length < INITIAL_RECOMMENDATION_TARGET) {
    const discovery = await fetchDiscoveryMix(userBooks, `${today}-fill`);
    books = onlyWithCover(
      dedupeByNormalizedTitle(
        [...books, ...discovery].filter((b) => !isInLibrary(b, userBooks)),
      ),
    ).slice(0, INITIAL_RECOMMENDATION_TARGET);
  }

  if (books.length < INITIAL_RECOMMENDATION_TARGET && tasteQueries.length > 0) {
    books = onlyWithCover(
      onlyRecommendable(
        await ensureMinimumRecommendations(
          books,
          userBooks,
          today,
          INITIAL_RECOMMENDATION_TARGET,
          tasteQueries,
        ),
      ),
    );
    books = dedupeByNormalizedTitle(books)
      .filter((b) => !isInLibrary(b, userBooks))
      .slice(0, INITIAL_RECOMMENDATION_TARGET);
  }

  if (books.length < INITIAL_RECOMMENDATION_TARGET) {
    const classics = await fetchFallbackClassics(
      userBooks,
      INITIAL_RECOMMENDATION_TARGET - books.length,
    );
    books = onlyWithCover(
      dedupeByNormalizedTitle(
        [...books, ...classics].filter((b) => !isInLibrary(b, userBooks)),
      ),
    ).slice(0, INITIAL_RECOMMENDATION_TARGET);
  }

  if (books.length === 0) {
    books = (await fetchDiscoveryMix(userBooks, `${today}-last`)).slice(
      0,
      INITIAL_RECOMMENDATION_TARGET,
    );
    heading = "Discover Your Next Read";
    subtitle = "Highly rated picks — new releases and modern favorites";
  }

  if (tasteProfile.weightedSubjects.size > 0 && books.length > 0) {
    const recommendable = onlyRecommendable(books);
    if (recommendable.length >= MIN_RECOMMENDATIONS) {
      books = onlyWithCover(sortByTaste(recommendable, tasteProfile)).slice(
        0,
        INITIAL_RECOMMENDATION_TARGET,
      );
    }
  }

  books = onlyWithCover(books)
    .filter((b) => !isInLibrary(b, userBooks))
    .slice(0, INITIAL_RECOMMENDATION_TARGET);

  const result: RecommendationResult = {
    books,
    mode,
    heading,
    subtitle,
    refreshedAt: today,
  };

  return result;
}

export interface FetchNextRecommendationOptions {
  ignoredIds?: string[];
  excludeIds?: string[];
}

/** Fetch a single replacement recommendation with a valid cover image. */
export async function fetchNextRecommendation(
  userBooks: BookEntry[],
  options: FetchNextRecommendationOptions = {},
): Promise<BookSearchResult | null> {
  const ignored = new Set(options.ignoredIds ?? []);
  const exclude = new Set(options.excludeIds ?? []);
  const usedTitleKeys = new Set<string>();

  for (const book of userBooks) {
    const key = normalizeTitle(book.title);
    if (key) usedTitleKeys.add(key);
  }

  function accept(book: BookSearchResult | null | undefined): book is BookSearchResult {
    if (!book || !isRecommendable(book) || !bookHasDisplayableCover(book, "list")) {
      return false;
    }
    if (ignored.has(book.id) || exclude.has(book.id)) return false;
    if (isInLibrary(book, userBooks)) return false;
    const key = normalizeTitle(book.title);
    if (!key || usedTitleKeys.has(key)) return false;
    usedTitleKeys.add(key);
    return true;
  }

  const seed = `${getTodayKey()}-${Date.now()}`;
  const afterYear = recentAfterYear();
  const historySeeds = pickRandomHistorySeeds(userBooks, seed, 2);
  const profile = buildTasteProfile(
    (historySeeds.length > 0 ? historySeeds : userBooks).map((book) => ({
      ...book,
      rating: book.rating ?? 3,
    })),
  );

  for (const book of historySeeds) {
    const subjects = genresForBook(book);
    const subject = subjects[0] ?? "fiction";
    const queries = [
      `${subjectQueryForGenre(subject)} bestseller after:${afterYear}`,
      subjectQueryForGenre(subject),
      authorQueryFor(book.author),
    ];

    for (const query of queries) {
      const openLibraryQuery = query.startsWith("inauthor:")
        ? primaryAuthor(book.author)
        : subject;
      const batch = await fetchWithFallback(query, openLibraryQuery);
      for (const candidate of batch) {
        if (accept(candidate)) return candidate;
      }
    }
  }

  for (const query of seededShuffle(
    [
      ...RECENT_DISCOVERY_QUERIES.map((q) => `${q} after:${afterYear}`),
      ...TRENDING_QUERIES,
    ],
    seed,
  )) {
    const batch = await fetchWithFallback(query, query);
    for (const book of batch) {
      if (accept(book)) return book;
    }
  }

  const classics = shuffleArray([...CLASSICS_POOL]);
  for (const classic of classics) {
    const titleKey = normalizeTitle(classic.title);
    if (!titleKey || usedTitleKeys.has(titleKey)) continue;
    if (userBooks.some((b) => normalizeTitle(b.title) === titleKey)) continue;

    const book = await fetchClassicBook(classic.title, classic.author);
    if (accept(book)) return book;
  }

  return null;
}

export function filterIgnoredRecommendations(
  books: BookSearchResult[],
  ignoredIds: Iterable<string>,
): BookSearchResult[] {
  const ignored = new Set(ignoredIds);
  return books.filter((book) => !ignored.has(book.id));
}

export function toPrefill(book: BookSearchResult) {
  return {
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl ?? "",
    description: ensureBookDescription(book.description),
    pageCount: book.pageCount,
    googleBooksId: book.id.startsWith("ol-") ? undefined : book.id,
    apiCategories: book.apiCategories ?? [],
    categories: resolveBookCategoryTags(
      book.apiCategories,
      book.categories,
      book.description,
      book.title,
      book.author,
      book.subtitle,
    ),
  };
}
