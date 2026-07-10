const CIRCUIT_STORAGE_KEY = "google_books_circuit_until";

/** @deprecated Circuit breaker disabled — kept for call-site compatibility. */
export function tripGoogleBooksCircuit(): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(CIRCUIT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}

/** Circuit breaker disabled — always allow live Google Books requests. */
export function isGoogleBooksCircuitOpen(): boolean {
  return false;
}
