"use client";

import { useEffect } from "react";
import { celebrateBookCompleted, celebrateSessionSaved } from "@/lib/celebration-confetti";
import { useReadingStreak } from "@/hooks/useReadingStreak";

/** Listens for reading milestones and fires tiered canvas confetti. */
export function CelebrationListener() {
  const { streak } = useReadingStreak();

  useEffect(() => {
    function handleSessionSaved() {
      void celebrateSessionSaved(streak);
    }

    function handleBookCompleted() {
      void celebrateBookCompleted();
    }

    window.addEventListener("reading-session-saved", handleSessionSaved);
    window.addEventListener("book-completed", handleBookCompleted);

    return () => {
      window.removeEventListener("reading-session-saved", handleSessionSaved);
      window.removeEventListener("book-completed", handleBookCompleted);
    };
  }, [streak]);

  return null;
}
