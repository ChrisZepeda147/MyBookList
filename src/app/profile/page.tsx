"use client";

import { MetricsDashboard } from "@/components/MetricsDashboard";
import { ProfileSection } from "@/components/ProfileSection";
import { ReadingHistory } from "@/components/ReadingHistory";
import { ReadingSessionHistory } from "@/components/ReadingSessionHistory";
import { SitePageHeader } from "@/components/SitePageHeader";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <SitePageHeader
        title="Profile"
        subtitle="Your goals, progress, and reading stats in one place."
      />

      <ProfileSection />
      <MetricsDashboard />
      <ReadingSessionHistory />
      <ReadingHistory />
    </div>
  );
}
