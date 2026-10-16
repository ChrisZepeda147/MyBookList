import type { AuthError, User } from "@supabase/supabase-js";

export const EMAIL_ALREADY_REGISTERED_MESSAGE =
  "An account with this email already exists. Please log in instead.";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailAlreadyRegistered(
  error: AuthError | null,
  user: User | null,
): boolean {
  if (error) {
    const message = error.message.toLowerCase();
    const code = (error.code ?? "").toLowerCase();
    return (
      code === "user_already_exists" ||
      message.includes("already registered") ||
      message.includes("already been registered") ||
      message.includes("user already exists")
    );
  }

  // With email confirmation on, Supabase returns a user with no linked identities.
  if (user && Array.isArray(user.identities) && user.identities.length === 0) {
    return true;
  }

  return false;
}

export const SUPABASE_UNREACHABLE_MESSAGE =
  "Could not reach the database. If this keeps happening, the Supabase project may be paused — restore it in the Supabase dashboard, then try again.";

export function isNetworkAuthFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  );
}

export function mapAuthErrorMessage(error: AuthError | null): string | null {
  if (!error) return null;
  if (isEmailAlreadyRegistered(error, null)) {
    return EMAIL_ALREADY_REGISTERED_MESSAGE;
  }

  const message = error.message.toLowerCase();
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before logging in. Check your inbox for the confirmation link.";
  }

  // Browser TypeError when Supabase is paused, offline, or blocked.
  if (isNetworkAuthFailure(error.message)) {
    return SUPABASE_UNREACHABLE_MESSAGE;
  }

  return error.message;
}

export function getAuthCallbackUrl(): string {
  if (typeof window === "undefined") return "/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

export function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}
