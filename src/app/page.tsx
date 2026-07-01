"use client";

import { LibrarySection } from "@/components/LibrarySection";
import { SitePageHeader } from "@/components/SitePageHeader";
import { useReadingStreak } from "@/hooks/useReadingStreak";
import {
  formatPersonalizedListTitle,
  getStreakRewardTextClassName,
} from "@/lib/reading-streak";
import { useBookStore } from "@/providers/BookStoreProvider";

export default function HomePage() {
  const { profile } = useBookStore();
  const { streak } = useReadingStreak();
  const titleRewardClass = getStreakRewardTextClassName(streak);

  return (
    <div className="space-y-8">
      <SitePageHeader
        title={formatPersonalizedListTitle(profile.username)}
        subtitle="Track, rate, and organize your reading journey."
        titleRewardClassName={titleRewardClass}
      />
      <LibrarySection />
    </div>
  );
}
