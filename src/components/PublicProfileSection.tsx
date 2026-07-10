"use client";

import Image from "next/image";
import { ArrowLeft, Target } from "lucide-react";
import { GoalProgress } from "@/components/GoalProgress";
import { resolveAvatarDisplaySrc } from "@/lib/storage/avatar-url";
import { computeProfileGoalMetrics } from "@/lib/public-profile-metrics";
import type { BookEntry } from "@/lib/types";
import type { PublicProfileSummary } from "@/lib/storage/public-profiles";
import { publicProfileLabel } from "@/lib/storage/public-profiles";

interface PublicProfileSectionProps {
  profile: PublicProfileSummary;
  books: BookEntry[];
  onBack: () => void;
}

export function PublicProfileSection({
  profile,
  books,
  onBack,
}: PublicProfileSectionProps) {
  const avatarDisplaySrc = resolveAvatarDisplaySrc(profile.avatarUrl);
  const displayName = profile.username || publicProfileLabel(profile);
  const metrics = computeProfileGoalMetrics(
    books,
    profile.readingGoal,
    profile.monthlyReadingGoal,
  );

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Reader profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Profile</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-blue-100 ring-4 ring-blue-50">
          {avatarDisplaySrc ? (
            <Image
              src={avatarDisplaySrc}
              alt={displayName}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized={avatarDisplaySrc.startsWith("blob:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-blue-600">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="w-full text-center sm:text-left">
          <h3 className="text-2xl font-bold text-slate-900">{displayName}</h3>
          {profile.email && (
            <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
          )}
          <p className="mt-2 max-w-md text-slate-500">{profile.bio}</p>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-center gap-2 sm:justify-start">
              <Target className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-slate-800">
                Reading goals
              </h4>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Progress toward the goals this reader has set.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <GoalProgress
                title={`${metrics.currentYear} book goal`}
                current={metrics.completedThisYear}
                goal={metrics.readingGoal}
                unit="books"
                progress={metrics.yearGoalProgress}
              />
              <GoalProgress
                title={`${metrics.monthName} book goal`}
                current={metrics.completedThisMonth}
                goal={metrics.monthlyReadingGoal}
                unit="books"
                progress={metrics.monthGoalProgress}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
