"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Shield } from "lucide-react";
import { useReadingStreak } from "@/hooks/useReadingStreak";

export function StreakShieldPrompt() {
  const { shieldOffer, useShield, declineShieldOffer } = useReadingStreak();
  const [mounted, setMounted] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showModal = shieldOffer.available || justActivated;

  if (!mounted || !showModal) {
    return null;
  }

  function handleUse() {
    useShield();
    setJustActivated(true);
  }

  function handleDecline() {
    declineShieldOffer();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-shield-prompt-title"
    >
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-sky-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-2xl ring-4 ring-sky-100">
            {justActivated ? (
              <span aria-hidden>🛡️</span>
            ) : (
              <Shield className="h-7 w-7 text-sky-500" />
            )}
          </div>

          {justActivated ? (
            <>
              <h2
                id="streak-shield-prompt-title"
                className="mt-4 text-lg font-semibold text-slate-900"
              >
                Streak Shield Activated!
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Your reading streak is safe. Finish a session today to keep it
                going.
              </p>
              <button
                type="button"
                onClick={() => setJustActivated(false)}
                className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <h2
                id="streak-shield-prompt-title"
                className="mt-4 text-lg font-semibold text-slate-900"
              >
                Use a Streak Shield?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                You missed a reading day. Spend 1 Streak Shield to protect your{" "}
                <span className="font-semibold text-slate-800">
                  {shieldOffer.preservedStreak}-day streak
                </span>
                ?
              </p>

              <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDecline}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  No thanks
                </button>
                <button
                  type="button"
                  onClick={handleUse}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  Use Streak Shield
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
