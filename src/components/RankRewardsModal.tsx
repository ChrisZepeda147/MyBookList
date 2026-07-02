"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { RankRewardsSection } from "@/components/RankRewardsSection";

interface RankRewardsModalProps {
  onClose: () => void;
}

export function RankRewardsModal({ onClose }: RankRewardsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const showContent = isVisible && !isClosing;

  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, []);

  function handleClose() {
    setIsClosing(true);
    window.setTimeout(onClose, 200);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 transition-opacity duration-200 sm:items-center sm:p-6 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-rewards-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-label="Close rank rewards"
      />

      <div
        className={`mobile-modal-panel mobile-modal-panel--xl relative z-10 w-full max-w-[36rem] origin-center scale-[0.9] transition-all duration-200 sm:scale-100 ${
          showContent ? "translate-y-0" : "translate-y-2"
        }`}
      >
        <div className="mb-2 flex justify-end sm:hidden">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-white p-2 text-slate-500 shadow-md"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl sm:max-h-[85vh]">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 hidden rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm transition-colors hover:text-slate-800 sm:inline-flex"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <RankRewardsSection />
        </div>
      </div>
    </div>,
    document.body,
  );
}
