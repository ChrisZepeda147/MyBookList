"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  buildShieldConsumptionUpdates,
  buildShieldDeclineUpdates,
  evaluateReadingStreak,
} from "@/lib/reading-streak";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import { useServerNow } from "@/hooks/useServerNow";
import { useBookStore } from "@/providers/BookStoreProvider";
import { useDemoPreview } from "@/providers/DemoPreviewProvider";

export function useReadingStreak() {
  const { sessions, hydrated: streakLogReady } = useReadingSessionLog();
  const { profile, updateProfile, loaded } = useBookStore();
  const { isPreviewMode } = useDemoPreview();
  const serverNow = useServerNow();
  const syncingRef = useRef(false);

  const evaluation = useMemo(
    () =>
      evaluateReadingStreak(
        sessions,
        {
          streakShields: profile.streakShields,
          lastShieldMilestone: profile.lastShieldMilestone,
          shieldedDates: profile.shieldedDates ?? [],
          lastShieldedDate: profile.lastShieldedDate,
          shieldActivatedOn: profile.shieldActivatedOn,
          shieldOfferDismissedFor: profile.shieldOfferDismissedFor,
        },
        serverNow,
      ),
    [
      sessions,
      profile.streakShields,
      profile.lastShieldMilestone,
      profile.shieldedDates,
      profile.lastShieldedDate,
      profile.shieldActivatedOn,
      profile.shieldOfferDismissedFor,
      serverNow,
    ],
  );

  useEffect(() => {
    if (isPreviewMode) return;
    if (!loaded || !evaluation.profileUpdates || syncingRef.current) return;

    const updates = evaluation.profileUpdates;
    const changed = (
      Object.entries(updates) as [keyof typeof updates, unknown][]
    ).some(([key, value]) => {
      const current = profile[key as keyof typeof profile];
      if (Array.isArray(current) || Array.isArray(value)) {
        return JSON.stringify(current ?? []) !== JSON.stringify(value ?? []);
      }
      return current !== value;
    });

    if (!changed) return;

    syncingRef.current = true;
    void updateProfile(updates).finally(() => {
      syncingRef.current = false;
    });
  }, [evaluation.profileUpdates, isPreviewMode, loaded, profile, updateProfile]);

  const useShield = useCallback(() => {
    if (isPreviewMode) return;
    const offer = evaluation.shieldOffer;
    if (!offer.available || !offer.missedDate) return;

    void updateProfile(
      buildShieldConsumptionUpdates(
        {
          streakShields: profile.streakShields,
          lastShieldMilestone: profile.lastShieldMilestone,
          shieldedDates: profile.shieldedDates ?? [],
          lastShieldedDate: profile.lastShieldedDate,
          shieldActivatedOn: profile.shieldActivatedOn,
          shieldOfferDismissedFor: profile.shieldOfferDismissedFor,
        },
        offer.missedDate,
        serverNow,
      ),
    );
  }, [evaluation.shieldOffer, isPreviewMode, profile, updateProfile, serverNow]);

  const declineShieldOffer = useCallback(() => {
    if (isPreviewMode) return;
    const offer = evaluation.shieldOffer;
    if (!offer.available || !offer.missedDate) return;

    void updateProfile(buildShieldDeclineUpdates(offer.missedDate));
  }, [evaluation.shieldOffer, isPreviewMode, updateProfile]);

  return {
    streak: evaluation.streak,
    streakShields: profile.streakShields,
    shieldActivated: evaluation.shieldActivatedToday,
    shieldsEarned: evaluation.shieldsEarned,
    shieldOffer: evaluation.shieldOffer,
    useShield,
    declineShieldOffer,
    ready: loaded && streakLogReady,
  };
}
