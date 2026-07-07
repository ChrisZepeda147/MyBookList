"use client";

import { BookList } from "@/components/BookList";
import { MonthlyReadingCalendar } from "@/components/MonthlyReadingCalendar";
import { ReadingStreakBanner } from "@/components/ReadingStreakBanner";
import { SitePageHeader } from "@/components/SitePageHeader";
import { StartReadingShortcut } from "@/components/StartReadingShortcut";

export default function CurrentlyReadingPage() {
  return (
    <div className="space-y-8">
      <ReadingStreakBanner />
      <StartReadingShortcut />

      <div className="space-y-6">
        <SitePageHeader
          title="Currently Reading"
          subtitle="Pick up where you left off and keep your daily streak going."
        />
        <BookList fixedStatus="reading" hideStatusFilter />
      </div>

      <MonthlyReadingCalendar />
    </div>
  );
}
