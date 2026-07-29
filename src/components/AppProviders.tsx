"use client";

import { usePathname } from "next/navigation";
import { AccountLoadingSpinner } from "@/components/AccountLoadingSpinner";
import { CelebrationListener } from "@/components/CelebrationListener";
import { Navigation } from "@/components/Navigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { BookStoreProvider, useBookStore } from "@/providers/BookStoreProvider";
import {
  DemoPreviewProvider,
  useDemoPreview,
} from "@/providers/DemoPreviewProvider";
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
  const { authReady } = useAuth();
  const { loaded } = useBookStore();
  const { hydrated: streakLogReady } = useReadingSessionLog();
  const { isPreviewMode } = useDemoPreview();

  if (isLoginPage) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 py-0 sm:px-6">
        {children}
      </main>
    );
  }

  // Same boot gate as a normal signed-in session.
  if (!authReady || !loaded || !streakLogReady) {
    return <AppBootScreen />;
  }

  return (
    <>
      <Navigation />
      {!isPreviewMode && <StreakShieldPrompt />}
      {!isPreviewMode && <CelebrationListener />}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DemoPreviewProvider>
        <BookStoreProvider>
          <ReadingSessionLogProvider>
            <StartReadingSessionProvider>
              <AppShell>{children}</AppShell>
            </StartReadingSessionProvider>
          </ReadingSessionLogProvider>
        </BookStoreProvider>
      </DemoPreviewProvider>
    </AuthProvider>
  );
}
