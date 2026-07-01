import { cleanDescription } from "@/lib/book-descriptions";
import { primaryAuthor, titlesMatch } from "@/lib/google-books-client";

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_BASE = "https://openlibrary.org";

interface OlSearchDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_sentence?: string[];
}

function parseOlDescription(value: unknown): string | null {
  if (typeof value === "string") return cleanDescription(value);
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "string"
  ) {
    return cleanDescription((value as { value: string }).value);
  }
  return null;
}

async function fetchOlWorkDescription(workKey: string): Promise<string | null> {
  const path = workKey.startsWith("/") ? workKey : `/${workKey}`;
  try {
    const response = await fetch(`${OPEN_LIBRARY_BASE}${path}.json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const work = (await response.json()) as { description?: unknown };
    return parseOlDescription(work.description);
  } catch {
    return null;
  }
}

function firstSentenceFromDoc(doc: OlSearchDoc): string | null {
  const sentence = doc.first_sentence?.join(" ").trim();
  return sentence ? cleanDescription(sentence) : null;
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
    fields: "key,title,author_name,first_sentence",
  });

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { docs?: OlSearchDoc[] };
    const docs = data.docs ?? [];

    for (const doc of docs) {
      if (doc.title && !titlesMatch(doc.title, title)) continue;

      if (doc.key?.includes("/works/")) {
        const workDescription = await fetchOlWorkDescription(doc.key);
        if (workDescription) return workDescription;
      }

      const sentence = firstSentenceFromDoc(doc);
      if (sentence && sentence.length >= 40) return sentence;
    }

    for (const doc of docs) {
      const sentence = firstSentenceFromDoc(doc);
      if (sentence) return sentence;
    }
  } catch {
    return null;
  }

  return null;
}
