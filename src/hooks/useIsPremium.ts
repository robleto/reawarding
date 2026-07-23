"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useUser } from "@/hooks/useUser";

const ENTITLED_STATUSES = new Set(["active", "trialing"]);

/**
 * Whether the current user has an entitled premium subscription. Mirrors
 * the Stripe Subscription status synced onto profiles.subscription_status
 * by /api/stripe/webhook — active and trialing both count as premium.
 */
export function useIsPremium(): boolean {
  const { userId } = useUser();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsPremium(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setIsPremium(Boolean(data?.subscription_status && ENTITLED_STATUSES.has(data.subscription_status)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isPremium;
}
