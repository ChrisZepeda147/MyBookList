export const FETCH_TIMEOUT_MS = 5000;
/** Client-side book search against external catalogs. */
export const BOOK_SEARCH_TIMEOUT_MS = 8000;
/** Client → /api/books/search (server may enrich results before responding). */
export const BOOK_SEARCH_API_TIMEOUT_MS = 15000;
/** Client → /api/books/recommendations (parallel catalog lookups on server). */
export const RECOMMENDATIONS_API_TIMEOUT_MS = 20000;

export class FetchTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

export function isFetchTimeoutError(err: unknown): err is FetchTimeoutError {
  return err instanceof FetchTimeoutError;
}

/**
 * fetch() with a hard timeout so UI loading states cannot hang on dead networks.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? FETCH_TIMEOUT_MS;
  const { timeoutMs: _omit, signal: externalSignal, ...rest } = init ?? {};

  const controller = new AbortController();
  let abortedByTimeout = false;
  const timer = setTimeout(() => {
    abortedByTimeout = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (abortedByTimeout) {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}
