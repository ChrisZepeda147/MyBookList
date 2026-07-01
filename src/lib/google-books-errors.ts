export const BOOKS_API_UNAVAILABLE =
  "Search temporarily unavailable. Please try again in a moment.";

export function isRateLimitStatus(status: number): boolean {
  return status === 429 || status === 403;
}

export class GoogleBooksApiError extends Error {
  readonly status?: number;
  readonly rateLimited: boolean;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GoogleBooksApiError";
    this.status = status;
    this.rateLimited = status != null && isRateLimitStatus(status);
  }
}

export function isGoogleBooksRateLimitError(err: unknown): boolean {
  if (err instanceof GoogleBooksApiError) return err.rateLimited;
  if (err instanceof Error && err.message === BOOKS_API_UNAVAILABLE) return true;
  return false;
}
