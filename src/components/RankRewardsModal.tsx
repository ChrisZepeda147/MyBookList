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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 transition-opacity duration-200 sm:p-6 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-rewards-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-label="Close rank rewards"
      />

      <div
        className={`rank-rewards-modal-panel premium-brown-surface ${
          showContent ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        }`}
      >
        <header className="rank-rewards-modal-panel__header">
          <button
            type="button"
            onClick={handleClose}
            className="rank-rewards-modal-panel__close"
            aria-label="Close rank rewards"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="rank-rewards-modal-panel__scroll">
          <RankRewardsSection inModal />
        </div>
      </div>
    </div>,
    document.body,
  );
}
