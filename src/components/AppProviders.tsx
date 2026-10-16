"use client";

import { usePathname } from "next/navigation";
import { AccountLoadingSpinner } from "@/components/AccountLoadingSpinner";
import { CelebrationListener } from "@/components/CelebrationListener";
import { Navigation } from "@/components/Navigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { BookStoreProvider } from "@/providers/BookStoreProvider";
import {
  DemoPreviewProvider,
  useDemoPreview,
} from "@/providers/DemoPreviewProvider";
import { ReadingSessionLogProvider } from "@/providers/ReadingSessionLogProvider";
import { StreakShieldPrompt } from "@/components/StreakShieldPrompt";
import { StartReadingSessionProvider } from "@/providers/StartReadingSessionProvider";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const { authReady } = useAuth();
  const { isPreviewMode } = useDemoPreview();

  if (isLoginPage) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 py-0 sm:px-6">
        {children}
      </main>
    );
  }

  // Only wait on local auth session check — never block the whole app on Supabase data.
  if (!authReady) {
    return <AccountLoadingSpinner label="Loading" />;
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
