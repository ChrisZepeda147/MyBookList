/**
 * Resolves the Google Books API key from env (server or client).
 * Supports Next.js and legacy Create React App variable names.
 */
export function getGoogleBooksApiKey(): string {
  return (
    process.env.GOOGLE_BOOKS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ??
    process.env.REACT_APP_GOOGLE_BOOKS_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_BOOKS_KEY ??
    ""
  );
}

/** Append `&key=` to a query string (safe when key is empty). */
export function withGoogleBooksApiKey(queryString: string): string {
  const key = getGoogleBooksApiKey();
  const separator = queryString.includes("?") ? "&" : "?";
  return `${queryString}${separator}key=${encodeURIComponent(key)}`;
}
