"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Flame, Pencil, Save, Sparkles, Target, Trophy, LogOut } from "lucide-react";
import { MyBookListLogo } from "@/components/MyBookListLogo";
import { getActiveAnnualBookRank } from "@/lib/annual-book-ranks";
import {
  computeWrappedStats,
  getMostRecentCompletedHalf,
} from "@/lib/reading-wrapped";
import { useBookStore, useMetrics } from "@/providers/BookStoreProvider";
import { GoalProgress } from "@/components/GoalProgress";
import { RankRewardsModal } from "@/components/RankRewardsModal";
import { ReadingWrappedModal } from "@/components/ReadingWrappedModal";
import { SignOutConfirmModal } from "@/components/SignOutConfirmModal";
import { useReadingStreak } from "@/hooks/useReadingStreak";
import { getStreakRewardTextClassName } from "@/lib/reading-streak";
import { resolveAvatarDisplaySrc } from "@/lib/storage/avatar-url";
import { uploadProfileAvatar } from "@/lib/storage/profile-avatar";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useReadingSessionLog } from "@/providers/ReadingSessionLogProvider";

export function ProfileSection() {
  const { user } = useAuth();
  const { profile, updateProfile, books } = useBookStore();
  const { sessions } = useReadingSessionLog();
  const { streak } = useReadingStreak();
  const nameRewardClass = getStreakRewardTextClassName(
    streak,
    profile.streakStyleId,
  );
  const {
    completedThisYear,
    completedThisMonth,
    readingGoal,
    monthlyReadingGoal,
    yearGoalProgress,
    monthGoalProgress,
    currentYear,
    monthName,
  } = useMetrics();
  const annualBookRank = getActiveAnnualBookRank(completedThisYear);
  const wrappedPeriod = useMemo(() => getMostRecentCompletedHalf(), []);
  const wrappedStats = useMemo(
    () => computeWrappedStats(sessions, books, wrappedPeriod),
    [books, sessions, wrappedPeriod],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [rankRewardsOpen, setRankRewardsOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function startEdit() {
    setDraft(profile);
    setAvatarError(null);
    setEditing(true);
  }

  async function save() {
    if (avatarUploading || saving) return;

    setSaving(true);
    try {
      await updateProfile(draft);
      setEditing(false);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(null);
      }
    } catch {
      setAvatarError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function parseGoal(value: string, fallback: number): number {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const supabase = createClient();
    if (!supabase || !user?.id) {
      setAvatarError("Sign in to upload a profile photo.");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreviewUrl(preview);
    setAvatarError(null);
    setAvatarUploading(true);

    try {
      const publicUrl = await uploadProfileAvatar(supabase, user.id, file);
      setDraft((prev) => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
      URL.revokeObjectURL(preview);
      setAvatarPreviewUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  const avatarDisplaySrc = editing
    ? resolveAvatarDisplaySrc(draft.avatarUrl, avatarPreviewUrl)
    : resolveAvatarDisplaySrc(profile.avatarUrl);
  const avatarName = editing ? draft.username : profile.username;
  const saveDisabled = avatarUploading || saving;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
          <button
            type="button"
            onClick={() => setRankRewardsOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Trophy className="h-3 w-3" />
            Rank Rewards
          </button>
          <button
            type="button"
            onClick={() => setWrappedOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-[#2a1810] px-2 py-0.5 text-[12px] font-semibold text-amber-100 transition-colors hover:bg-[#3a2218]"
          >
            <Sparkles className="h-3 w-3" />
            6-Month Wrapped
          </button>
        </div>
        <button
          type="button"
          onClick={editing ? save : startEdit}
          disabled={editing && saveDisabled}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editing ? (
            <>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" /> Edit
            </>
          )}
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-blue-100 ring-4 ring-blue-50">
          {avatarDisplaySrc ? (
            <Image
              src={avatarDisplaySrc}
              alt={avatarName}
              fill
              className="object-cover"
              unoptimized={avatarDisplaySrc.startsWith("blob:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-blue-600">
              {avatarName.charAt(0).toUpperCase()}
            </div>
          )}
          {avatarUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium text-slate-600">
              Uploading…
            </div>
          )}
        </div>

        {editing ? (
          <div className="w-full flex-1 space-y-3">
            <input
              type="text"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Profile photo
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={avatarUploading}
                onChange={handleAvatarFileChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {avatarError && (
                <p className="mt-1 text-xs text-red-600">{avatarError}</p>
              )}
            </div>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-800">
                  Set your reading goals
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Books to read in {currentYear}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={draft.readingGoal}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        readingGoal: parseGoal(e.target.value, draft.readingGoal),
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Books to read in {monthName}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.monthlyReadingGoal}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        monthlyReadingGoal: parseGoal(
                          e.target.value,
                          draft.monthlyReadingGoal,
                        ),
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full text-center sm:text-left">
            <h3
              className={`text-2xl font-bold ${nameRewardClass ?? "text-slate-900"}`}
            >
              {profile.username}
            </h3>
            <p className="mt-2 max-w-md text-slate-500">{profile.bio}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                <Flame className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                <span>
                  <span className="font-semibold">{streak}</span> day streak
                </span>
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">
                <MyBookListLogo size={16} className="h-4 w-4" aria-hidden />
                <span className="truncate">{annualBookRank.title}</span>
                <span className="shrink-0 text-xs font-normal text-amber-700/80">
                  ({currentYear})
                </span>
              </span>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-slate-800">
                  My reading goals
                </h4>
              </div>
              <p className="mb-4 text-sm text-slate-500">
                How close you are to the targets you set for yourself.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <GoalProgress
                  title={`${currentYear} book goal`}
                  current={completedThisYear}
                  goal={readingGoal}
                  unit="books"
                  progress={yearGoalProgress}
                />
                <GoalProgress
                  title={`${monthName} book goal`}
                  current={completedThisMonth}
                  goal={monthlyReadingGoal}
                  unit="books"
                  progress={monthGoalProgress}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {rankRewardsOpen && (
        <RankRewardsModal onClose={() => setRankRewardsOpen(false)} />
      )}

      {wrappedOpen && (
        <ReadingWrappedModal
          period={wrappedPeriod}
          stats={wrappedStats}
          onClose={() => setWrappedOpen(false)}
        />
      )}

      <div className="mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() => setSignOutOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {signOutOpen && (
        <SignOutConfirmModal onClose={() => setSignOutOpen(false)} />
      )}
    </section>
  );
}
