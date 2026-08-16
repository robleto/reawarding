"use client";

import { useProfile } from "@/contexts/ProfileContext";

/**
 * Whether the current user has an entitled premium subscription. Mirrors
 * the Stripe Subscription status synced onto profiles.subscription_status
 * by /api/stripe/webhook — active and trialing both count as premium.
 *
 * Thin wrapper around the shared ProfileContext (see
 * src/contexts/ProfileContext.tsx) — no longer issues its own
 * `SELECT subscription_status FROM profiles` request, it reads the cached
 * profile fetched once by ProfileProvider.
 */
export function useIsPremium(): boolean {
  const { isPremium } = useProfile();
  return isPremium;
}
