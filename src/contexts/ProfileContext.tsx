"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuthState } from "@/hooks/useAuthState";

// Mirrors the Stripe Subscription status synced onto profiles.subscription_status
// by /api/stripe/webhook — active and trialing both count as premium.
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

interface ProfileContextValue {
  profile: any;
  loading: boolean;
  error: string | null;
  created: boolean;
  isAdmin: boolean;
  isPremium: boolean;
}

const defaultValue: ProfileContextValue = {
  profile: null,
  loading: false,
  error: null,
  created: false,
  isAdmin: false,
  isPremium: false,
};

const ProfileContext = createContext<ProfileContextValue>(defaultValue);

/**
 * ProfileProvider — fetches the current user's `profiles` row exactly ONCE
 * per session/user-id change (creating it if missing) and derives
 * is_admin / subscription_status from that single cached result.
 *
 * Consolidates what used to be three independent hooks (useEnsureProfile,
 * useIsAdmin, useIsPremium) each issuing their own `SELECT ... FROM profiles`
 * round trip for the same row. Call useProfile() anywhere below this
 * provider (mounted app-wide in src/app/providers.tsx) instead.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!user || !userId) {
      setProfile(null);
      setCreated(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const checkAndCreate = async () => {
      setLoading(true);
      setError(null);

      // 1. Check for existing profile. Reads via `profiles_self`, not the
      // base `profiles` table — that view is pre-filtered to `id =
      // auth.uid()`, which is how `authenticated` can see privileged
      // columns (is_admin, subscription_status, ...) for their OWN row
      // without a table-wide grant. See
      // supabase/migrations/20260816000000_restrict_profiles_authenticated_select.sql.
      const { data, error: selectError } = await supabase
        .from("profiles_self")
        .select("*")
        .single();

      if (cancelled) return;

      if (selectError && selectError.code !== "PGRST116") {
        setError(selectError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
        setCreated(false);
        setLoading(false);
        return;
      }

      // 2. If not found, create it. Deliberately NOT chaining `.select()`
      // on the insert: that would request `RETURNING *`, which needs
      // table-wide SELECT on every column (including privileged ones)
      // regardless of who inserted the row — `authenticated` no longer has
      // that. Re-fetch via `profiles_self` instead, which picks up the
      // freshly inserted row (with its column defaults for is_admin /
      // subscription_status / etc.) under the same privilege as step 1.
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        username: user.email?.split("@")[0] || user.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

      if (cancelled) return;

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      const { data: newProfile, error: refetchError } = await supabase
        .from("profiles_self")
        .select("*")
        .single();

      if (cancelled) return;

      if (refetchError) {
        setError(refetchError.message);
        setLoading(false);
        return;
      }

      setProfile(newProfile);
      setCreated(true);
      setLoading(false);
    };

    checkAndCreate();

    return () => {
      cancelled = true;
    };
    // Keyed on the user id (not the user object reference) so an unrelated
    // re-render that produces a new `user` object with the same id doesn't
    // re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isAdmin = Boolean(profile?.is_admin);
  const isPremium = Boolean(
    profile?.subscription_status && ENTITLED_STATUSES.has(profile.subscription_status)
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, loading, error, created, isAdmin, isPremium }),
    [profile, loading, error, created, isAdmin, isPremium]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Single shared read of the current user's profile row + derived admin/
 * premium flags. Replaces independent calls to useEnsureProfile/useIsAdmin/
 * useIsPremium — those hooks now proxy this context rather than issuing
 * their own network requests.
 */
export function useProfile() {
  return useContext(ProfileContext);
}
