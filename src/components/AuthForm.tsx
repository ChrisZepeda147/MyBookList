"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { safeRedirectPath } from "@/lib/auth-utils";
import { useAuth } from "@/providers/AuthProvider";

type Mode = "login" | "signup";

const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback_failed:
    "We could not finish signing you in from the email link. Try logging in with your password.",
  confirmation_failed:
    "Email confirmation failed or the link expired. Try logging in or sign up again.",
};

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authReady, signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTarget = safeRedirectPath(searchParams.get("next"));
  const isSwapProfiles = searchParams.get("swap") === "1";

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError && CALLBACK_ERRORS[callbackError]) {
      setError(CALLBACK_ERRORS[callbackError]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authReady || !user) return;
    router.replace(redirectTarget);
    router.refresh();
  }, [authReady, user, router, redirectTarget]);

  function goToApp() {
    router.replace(redirectTarget);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      );
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          goToApp();
        }
      } else {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
          if (result.emailAlreadyRegistered) {
            setMode("login");
            setPassword("");
            setConfirmPassword("");
          }
        } else if (result.needsEmailConfirm) {
          setMessage(
            "Account created! Check your email to confirm, then log in.",
          );
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        } else {
          goToApp();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-blue-800">
          MyBookList
        </h1>
        <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900/90">
          {isSwapProfiles
            ? "Sign in with a different account to keep reading."
            : mode === "login"
              ? "Welcome back — pick up where you left off."
              : "Start tracking your reading journey today."}
        </p>
      </div>

      <div className="mb-6 flex rounded-xl bg-blue-50 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setMessage(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            mode === "login"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-blue-600/70 hover:text-blue-700"
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setMessage(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            mode === "signup"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-blue-600/70 hover:text-blue-700"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            placeholder="••••••••"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              placeholder="••••••••"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "login" ? "Signing in…" : "Creating account…"}
            </>
          ) : mode === "login" ? (
            "Log In"
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
}
