"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

interface DemoPreviewContextValue {
  /** True when browsing as the read-only demo account (not signed in). */
  isPreviewMode: boolean;
  requireAccount: (mode?: "login" | "signup") => void;
}

const DemoPreviewContext = createContext<DemoPreviewContextValue | null>(null);

export function DemoPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPreviewMode = authReady && !user && pathname !== "/login";

  const requireAccount = useCallback(
    (mode: "login" | "signup" = "signup") => {
      const next = pathname && pathname !== "/login" ? pathname : "/";
      const params = new URLSearchParams();
      params.set("next", next);
      if (mode === "signup") params.set("mode", "signup");
      router.push(`/login?${params.toString()}`);
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({ isPreviewMode, requireAccount }),
    [isPreviewMode, requireAccount],
  );

  return (
    <DemoPreviewContext.Provider value={value}>
      {children}
    </DemoPreviewContext.Provider>
  );
}

export function useDemoPreview() {
  const context = useContext(DemoPreviewContext);
  if (!context) {
    throw new Error("useDemoPreview must be used within DemoPreviewProvider");
  }
  return context;
}
