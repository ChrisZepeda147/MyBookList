const CIRCUIT_STORAGE_KEY = "google_books_circuit_until";
const CIRCUIT_DURATION_MS = 60 * 60 * 1000;

let serverCircuitUntil = 0;

/** Pause Google Books requests after a 429/403 (1 hour). */
export function tripGoogleBooksCircuit(): void {
  const until = Date.now() + CIRCUIT_DURATION_MS;
  serverCircuitUntil = until;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(CIRCUIT_STORAGE_KEY, String(until));
    } catch {
      // Ignore storage failures.
    }
  }
}

export function isGoogleBooksCircuitOpen(): boolean {
  const now = Date.now();
  if (serverCircuitUntil > now) return true;

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CIRCUIT_STORAGE_KEY);
      if (!raw) return false;

      const until = Number(raw);
      if (until > now) {
        serverCircuitUntil = until;
        return true;
      }

      sessionStorage.removeItem(CIRCUIT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  return false;
}
