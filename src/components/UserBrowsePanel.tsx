"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { SitePageHeader } from "@/components/SitePageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PublicLibrarySection } from "@/components/PublicLibrarySection";
import { PublicProfileSection } from "@/components/PublicProfileSection";
import { ReadingStreakDisplay } from "@/components/ReadingStreakDisplay";
import {
  computePublicProfileStreak,
  fetchBrowsableProfiles,
  fetchUserBooksForBrowse,
  fetchUserReadingSessionsForBrowse,
  filterBrowsableProfiles,
  publicProfileLabel,
  type PublicProfileSummary,
} from "@/lib/storage/public-profiles";
import { createClient } from "@/lib/supabase/client";
import type { BookEntry, ReadingSessionLogEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

interface UserBrowsePanelProps {
  embedded?: boolean;
}

export function UserBrowsePanel({ embedded = false }: UserBrowsePanelProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PublicProfileSummary[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] =
    useState<PublicProfileSummary | null>(null);
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [sessions, setSessions] = useState<ReadingSessionLogEntry[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setProfiles([]);
      setProfilesLoading(false);
      return;
    }

    let cancelled = false;
    setProfilesLoading(true);
    setProfilesError(null);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setProfilesError("Supabase is not configured.");
          setProfilesLoading(false);
        }
        return;
      }

      try {
        const rows = await fetchBrowsableProfiles(supabase, user.id);
        if (!cancelled) setProfiles(rows);
      } catch {
        if (!cancelled) {
          setProfilesError("Could not load users. Please try again.");
        }
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedProfile) {
      setBooks([]);
      setSessions([]);
      setBooksLoading(false);
      setBooksError(null);
      return;
    }

    let cancelled = false;
    setBooksLoading(true);
    setBooksError(null);
    setBooks([]);
    setSessions([]);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setBooksError("Supabase is not configured.");
          setBooksLoading(false);
        }
        return;
      }

      try {
        const [bookRows, sessionRows] = await Promise.all([
          fetchUserBooksForBrowse(supabase, selectedProfile.id),
          fetchUserReadingSessionsForBrowse(supabase, selectedProfile.id),
        ]);
        if (!cancelled) {
          setBooks(bookRows);
          setSessions(sessionRows);
        }
      } catch {
        if (!cancelled) {
          setBooksError("Could not load this profile. Please try again.");
        }
      } finally {
        if (!cancelled) setBooksLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProfile]);

  const selectedProfileStreak = useMemo(() => {
    if (!selectedProfile) return 0;
    return computePublicProfileStreak(sessions, selectedProfile);
  }, [selectedProfile, sessions]);

  const filteredProfiles = useMemo(
    () => filterBrowsableProfiles(profiles, searchQuery),
    [profiles, searchQuery],
  );

  const hasSearchQuery = searchQuery.trim().length > 0;

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (!value.trim()) {
      setSelectedProfile(null);
      return;
    }
    if (
      selectedProfile &&
      !filterBrowsableProfiles([selectedProfile], value).some(
        (p) => p.id === selectedProfile.id,
      )
    ) {
      setSelectedProfile(null);
    }
  }

  function handleBackToSearch() {
    setSelectedProfile(null);
  }

  const outerClass = embedded
    ? "space-y-8 pt-4"
    : "space-y-8 max-md:flex max-md:h-full max-md:flex-col max-md:gap-8 max-md:space-y-0";

  const innerClass = embedded
    ? "space-y-8"
    : "space-y-8 max-md:flex max-md:flex-1 max-md:flex-col max-md:gap-8 max-md:space-y-0";

  return (
    <div className={outerClass}>
      {!selectedProfile && (
        <SitePageHeader
          title="User Search"
          subtitle="Search by first name, display name, or email to view a reader's profile and library."
        />
      )}

      <div className={innerClass}>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Find a reader</h2>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="First name, display name, or email…"
              className="add-book-user-search-input w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {!hasSearchQuery && !profilesLoading && !profilesError && (
            <p className="mt-4 text-sm text-slate-500">
              Type a first name, display name, or email to find someone.
            </p>
          )}

          {profilesLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : profilesError ? (
            <p className="mt-4 text-sm text-red-600">{profilesError}</p>
          ) : hasSearchQuery && filteredProfiles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {profiles.length === 0
                ? "No other readers in the system yet."
                : "No users match your search."}
            </p>
          ) : hasSearchQuery ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {filteredProfiles.map((profile) => {
                const active = selectedProfile?.id === profile.id;
                const label = publicProfileLabel(profile);
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(profile)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2 ${
                        active
                          ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      <ProfileAvatar
                        name={profile.username}
                        avatarUrl={profile.avatarUrl}
                        size="sm"
                        ringClassName={
                          active ? "ring-blue-400" : "ring-slate-100"
                        }
                      />
                      <span>
                        {label}
                        {profile.username !== label && (
                          <span
                            className={
                              active ? "text-blue-100" : "text-slate-400"
                            }
                          >
                            {" "}
                            · {profile.username}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {selectedProfile && (
          <>
            <PublicProfileSection
              profile={selectedProfile}
              books={books}
              onBack={handleBackToSearch}
            />

            {!booksError && !booksLoading && (
              <ReadingStreakDisplay
                streak={selectedProfileStreak}
                emptyMessage="No active reading streak."
              />
            )}

            {booksError && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {booksError}
              </p>
            )}

            {!booksError && (
              <div
                className={
                  embedded ? undefined : "max-md:flex max-md:flex-1 max-md:flex-col"
                }
              >
                <PublicLibrarySection
                  books={books}
                  loaded={!booksLoading}
                  layoutUserId={selectedProfile.id}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
