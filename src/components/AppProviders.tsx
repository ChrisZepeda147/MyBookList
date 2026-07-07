"use client";

import { usePathname } from "next/navigation";
import { AccountLoadingSpinner } from "@/components/AccountLoadingSpinner";
import { Navigation } from "@/components/Navigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { BookStoreProvider, useBookStore } from "@/providers/BookStoreProvider";
import {
  ReadingSessionLogProvider,
  useReadingSessionLog,
} from "@/providers/ReadingSessionLogProvider";
import { StreakShieldPrompt } from "@/components/StreakShieldPrompt";
import { StartReadingSessionProvider } from "@/providers/StartReadingSessionProvider";

function AppBootScreen() {
  return <AccountLoadingSpinner label="Loading your account" />;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const { user, authReady } = useAuth();
  const { loaded } = useBookStore();
  const { hydrated: streakLogReady } = useReadingSessionLog();

  if (isLoginPage) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-0 sm:px-6">
        {children}
      </main>
    );
  }

  const waitingForAccount =
    !authReady || (user != null && (!loaded || !streakLogReady));

  if (waitingForAccount) {
    return <AppBootScreen />;
  }

  return (
    <>
      <Navigation />
      <StreakShieldPrompt />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BookStoreProvider>
        <ReadingSessionLogProvider>
          <StartReadingSessionProvider>
            <AppShell>{children}</AppShell>
          </StartReadingSessionProvider>
        </ReadingSessionLogProvider>
      </BookStoreProvider>
    </AuthProvider>
  );
}
