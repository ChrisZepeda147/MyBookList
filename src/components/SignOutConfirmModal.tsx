"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2, LogOut, Undo2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface SignOutConfirmModalProps {
  onClose: () => void;
}

export function SignOutConfirmModal({ onClose }: SignOutConfirmModalProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [busy, setBusy] = useState<"swap" | "signout" | null>(null);

  const showContent = isVisible && !isClosing;

  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) handleGoBack();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [busy]);

  function animateClose(callback: () => void) {
    setIsClosing(true);
    window.setTimeout(callback, 200);
  }

  function handleGoBack() {
    if (busy) return;
    animateClose(onClose);
  }

  async function handleSwapProfiles() {
    if (busy) return;
    setBusy("swap");
    try {
      await signOut();
      animateClose(() => {
        onClose();
        router.push("/login?swap=1");
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy("signout");
    try {
      await signOut();
      animateClose(() => {
        onClose();
        router.push("/login");
        router.refresh();
      });
    } finally {
      setBusy(null);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-out-dialog-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleGoBack}
        disabled={!!busy}
        aria-label="Close dialog"
      />

      <div
        className={`mobile-modal-panel mobile-modal-panel--sm relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/10 transition-all duration-200 ${
          showContent ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400" />

        <div className="p-6">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25">
              <LogOut className="h-5 w-5" />
            </div>
            <h2
              id="sign-out-dialog-title"
              className="font-display text-xl font-extrabold text-blue-800"
            >
              Leaving so soon?
            </h2>
            <p className="mt-2 border-l-4 border-amber-300/90 pl-3 text-left text-sm leading-relaxed text-slate-600">
              Choose what you&apos;d like to do — you can swap accounts, sign out
              completely, or stay right where you are.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleSwapProfiles}
              disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "swap" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Swap Profiles
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition-all duration-200 hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "signout" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign Out
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Undo2 className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
