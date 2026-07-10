import { cleanDescription } from "@/lib/book-descriptions";
import { primaryAuthor, titlesMatch } from "@/lib/google-books-client";

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_BASE = "https://openlibrary.org";

export interface OlSearchDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_sentence?: string[] | string;
  description?: unknown;
}

/** Parse Open Library text fields: strings, { value }, { type, value }, bio, text, arrays. */
export function parseOpenLibraryTextField(value: unknown): string | null {
  if (typeof value === "string") return cleanDescription(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseOpenLibraryTextField(item);
      if (parsed) return parsed;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of ["value", "text", "bio", "description"] as const) {
    if (typeof record[key] === "string") {
      const parsed = cleanDescription(record[key] as string);
      if (parsed) return parsed;
    }
  }

  return null;
}

/** Extract the best description-like text from a work/edition JSON record. */
export function extractOpenLibraryDescriptionFromRecord(
  record: Record<string, unknown> | null | undefined,
): string | null {
  if (!record) return null;

  for (const field of [
    "description",
    "excerpt",
    "first_sentence",
    "bio",
    "text",
    "notes",
  ] as const) {
    const parsed = parseOpenLibraryTextField(record[field]);
    if (parsed) return parsed;
  }

  return null;
}

async function fetchOlJsonRecord(
  path: string,
): Promise<Record<string, unknown> | null> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  try {
    const response = await fetch(`${OPEN_LIBRARY_BASE}${normalized}.json`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Fetch description from an Open Library work key (e.g. /works/OL123W). */
export async function fetchOpenLibraryDescriptionByWorkKey(
  workKey: string,
): Promise<string | null> {
  const path = workKey.startsWith("/") ? workKey : `/${workKey}`;
  if (!path.includes("/works/") && !path.includes("/books/")) return null;

  const record = await fetchOlJsonRecord(path);
  return extractOpenLibraryDescriptionFromRecord(record);
}

async function fetchOlWorkDescription(workKey: string): Promise<string | null> {
  return fetchOpenLibraryDescriptionByWorkKey(workKey);
}

function firstSentenceFromDoc(doc: OlSearchDoc): string | null {
  if (Array.isArray(doc.first_sentence)) {
    const sentence = doc.first_sentence.join(" ").trim();
    return sentence ? cleanDescription(sentence) : null;
  }
  return parseOpenLibraryTextField(doc.first_sentence);
}

function inlineDescriptionFromDoc(doc: OlSearchDoc): string | null {
  return parseOpenLibraryTextField(doc.description);
}

/**
 * Resolve the best available description for a search.json doc:
 * inline description → work record → first sentence.
 */
export async function resolveOpenLibraryDocDescription(
  doc: OlSearchDoc,
): Promise<string | null> {
  const inline = inlineDescriptionFromDoc(doc);
  if (inline) return inline;

  if (doc.key?.includes("/works/")) {
    const workDescription = await fetchOlWorkDescription(doc.key);
    if (workDescription) return workDescription;
  }

  const sentence = firstSentenceFromDoc(doc);
  if (sentence) return sentence;

  return null;
}

/** Fetch a synopsis from Open Library when Google Books has none. */
export async function fetchOpenLibraryDescription(
  title: string,
  author: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    title: title.trim(),
    author: primaryAuthor(author).trim(),
    limit: "5",
    fields: "key,title,author_name,first_sentence,description",
  });

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { docs?: OlSearchDoc[] };
    const docs = data.docs ?? [];

    for (const doc of docs) {
      if (doc.title && !titlesMatch(doc.title, title)) continue;
      const description = await resolveOpenLibraryDocDescription(doc);
      if (description) return description;
    }

    for (const doc of docs) {
      const description = await resolveOpenLibraryDocDescription(doc);
      if (description) return description;
    }
  } catch {
    return null;
  }

  return null;
}
