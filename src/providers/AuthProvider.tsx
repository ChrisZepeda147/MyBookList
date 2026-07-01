"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  getAuthCallbackUrl,
  isEmailAlreadyRegistered,
  mapAuthErrorMessage,
  normalizeAuthEmail,
} from "@/lib/auth-utils";

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    error: string | null;
    needsEmailConfirm: boolean;
    emailAlreadyRegistered: boolean;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const configured = useMemo(() => createClient() !== null, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUser(data.user);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase) {
      return { error: "Supabase is not configured. Add env variables." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeAuthEmail(email),
      password,
    });

    if (error) {
      return { error: mapAuthErrorMessage(error) };
    }

    if (!data.session) {
      return {
        error: "Sign-in succeeded but no session was created. Please try again.",
      };
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase) {
      return {
        error: "Supabase is not configured. Add env variables.",
        needsEmailConfirm: false,
        emailAlreadyRegistered: false,
      };
    }

    const normalizedEmail = normalizeAuthEmail(email);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          username: normalizedEmail.split("@")[0] || "Bookworm",
        },
      },
    });

    if (isEmailAlreadyRegistered(error, data.user)) {
      return {
        error: EMAIL_ALREADY_REGISTERED_MESSAGE,
        needsEmailConfirm: false,
        emailAlreadyRegistered: true,
      };
    }

    const needsEmailConfirm =
      !error && data.user !== null && data.session === null;

    return {
      error: mapAuthErrorMessage(error),
      needsEmailConfirm,
      emailAlreadyRegistered: false,
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      configured,
      signIn,
      signUp,
      signOut,
    }),
    [user, authReady, configured, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
