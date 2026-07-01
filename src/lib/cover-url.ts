/**
 * Google Books and Open Library covers are often tiny thumbnails that look
 * blurry when stretched in modals. Tune URL params for a balance of clarity,
 * load speed, and availability on older titles.
 */

export type CoverUrlVariant = "list" | "modal";

function isGoogleCoverUrl(url: string): boolean {
  return (
    url.includes("books.google") || url.includes("googleusercontent.com")
  );
}

function setQueryParam(url: string, key: string, value: string): string {
  const pattern = new RegExp(`([?&])${key}=[^&]*`, "i");
  if (pattern.test(url)) {
    return url.replace(pattern, `$1${key}=${value}`);
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
}

function applyGoogleCoverParams(
  url: string,
  variant: CoverUrlVariant,
): string {
  let next = url.replace(/&edge=curl/gi, "");

  if (variant === "modal") {
    next = /[?&]zoom=\d+/i.test(next)
      ? next.replace(/([?&])zoom=\d+/gi, "$1zoom=2")
      : setQueryParam(next, "zoom", "2");
    next = /[?&]fife=w\d+/i.test(next)
      ? next.replace(/([?&])fife=w\d+/gi, "$1fife=w400")
      : setQueryParam(next, "fife", "w400");
    return next;
  }

  if (/[?&]zoom=0/i.test(next)) {
    next = next.replace(/([?&])zoom=0/gi, "$1zoom=1");
  }
  if (/[?&]fife=w800/i.test(next)) {
    next = next.replace(/([?&])fife=w800/gi, "$1fife=w400");
  }

  return next;
}

/** True when the string is a usable http(s) image URL. */
export function isValidCoverUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false;

  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function upsampleCoverUrl(
  url: string | null | undefined,
  variant: CoverUrlVariant = "list",
): string | null {
  if (!isValidCoverUrl(url)) return null;

  let next = url!.trim().replace(/^http:/i, "https:");

  if (isGoogleCoverUrl(next)) {
    next = applyGoogleCoverParams(next, variant);
  }

  if (variant === "modal" && next.includes("openlibrary.org")) {
    next = next.replace(/-S\.jpg$/i, "-M.jpg");
    next = next.replace(/-L\.jpg$/i, "-M.jpg");
  }

  return isValidCoverUrl(next) ? next : null;
}

export function normalizeCoverUrl(url?: string): string | null {
  return upsampleCoverUrl(url, "list");
}

export function resolveCoverUrl(
  url: string | null | undefined,
  variant: CoverUrlVariant = "list",
): string | null {
  return upsampleCoverUrl(url, variant);
}

export function bookHasDisplayableCover(
  book: { coverUrl?: string | null },
  variant: CoverUrlVariant = "list",
): boolean {
  return resolveCoverUrl(book.coverUrl, variant) !== null;
}

export function filterBooksWithDisplayableCovers<
  T extends { coverUrl?: string | null },
>(books: T[], variant: CoverUrlVariant = "list"): T[] {
  return books.filter((book) => bookHasDisplayableCover(book, variant));
}
