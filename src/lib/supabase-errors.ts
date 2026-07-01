/** Readable message from unknown thrown values (Error, PostgREST, fetch failures). */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const row = err as { message?: string; code?: string };
    if (row.code && row.message) return `${row.code}: ${row.message}`;
    if (row.message) return row.message;
  }
  return String(err);
}

/** Readable message from Supabase/PostgREST errors (plain objects, not Error instances). */
export function formatDbError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const row = err as { message?: string; code?: string };
    if (row.code && row.message) return `${row.code}: ${row.message}`;
    if (row.message) return row.message;
  }
  return formatUnknownError(err);
}
