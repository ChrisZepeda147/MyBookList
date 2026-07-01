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

export function useReadingStreak() {
  const { sessions, hydrated: streakLogReady } = useReadingSessionLog();
  const { profile, updateProfile, loaded } = useBookStore();
  const serverNow = useServerNow();
  const syncingRef = useRef(false);

  const evaluation = useMemo(
    () =>
      evaluateReadingStreak(
        sessions,
        {
          streakShields: profile.streakShields,
          lastShieldMilestone: profile.lastShieldMilestone,
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
      profile.lastShieldedDate,
      profile.shieldActivatedOn,
      profile.shieldOfferDismissedFor,
      serverNow,
    ],
  );

  useEffect(() => {
    if (!loaded || !evaluation.profileUpdates || syncingRef.current) return;

    const updates = evaluation.profileUpdates;
    const changed = (
      Object.entries(updates) as [keyof typeof updates, unknown][]
    ).some(([key, value]) => profile[key] !== value);

    if (!changed) return;

    syncingRef.current = true;
    void updateProfile(updates).finally(() => {
      syncingRef.current = false;
    });
  }, [evaluation.profileUpdates, loaded, profile, updateProfile]);

  const useShield = useCallback(() => {
    const offer = evaluation.shieldOffer;
    if (!offer.available || !offer.missedDate) return;

    void updateProfile(
      buildShieldConsumptionUpdates(
        profile,
        offer.missedDate,
        serverNow,
      ),
    );
  }, [evaluation.shieldOffer, profile, updateProfile, serverNow]);

  const declineShieldOffer = useCallback(() => {
    const offer = evaluation.shieldOffer;
    if (!offer.available || !offer.missedDate) return;

    void updateProfile(buildShieldDeclineUpdates(offer.missedDate));
  }, [evaluation.shieldOffer, updateProfile]);

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
