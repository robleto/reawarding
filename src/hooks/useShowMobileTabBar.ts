"use client";

import { useAuthState } from "@/hooks/useAuthState";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

/**
 * Whether the bottom tab bar should render.
 *
 * Lives here rather than inline in AppShell because three things key off it —
 * the tab bar itself, `main`'s bottom padding, and BackToTopButton's offset —
 * and they must agree, or the layout reserves space for a bar that isn't there.
 *
 * The rule (docs/design/logged-out-native-home.md):
 *   - signed in            → always
 *   - guest, has rated     → yes; they're past first open and need to navigate
 *   - guest, nothing rated → no
 *   - auth still resolving → no
 *
 * That last guest case is the point. The logged-out first-open screen is a
 * single activation surface — one instruction, one search box — and a bottom
 * nav there is three more things to tap instead of the one that matters. Once
 * they've rated something, NativeGuestHome swaps to the returning-guest state
 * and navigation starts earning its place; the predicate below is deliberately
 * the same one that drives that swap (a numeric rating, not merely `seenIt`
 * or `hasInteracted`), so the bar appears exactly when that screen changes.
 *
 * Guests were previously shown no tab bar at all — `AppShell` gated it on
 * `isAuthenticated`. Note the history: the "two dead tabs" this was originally
 * written up as fixing (tapping guest Awards/Rankings hitting a login wall)
 * could not actually happen, because guests had no tabs to tap. The real
 * change here is *granting* guests navigation, and only after first open.
 */
export function useShowMobileTabBar(): boolean {
  const { status, isAuthenticated } = useAuthState();

  // Zustand persist rehydrates from localStorage after mount, so this reads
  // false on the very first client render for a returning guest. That errs
  // toward hiding the bar for a frame, which is the safe direction here.
  const guestHasRated = useGuestRankingStore((state) =>
    Object.values(state.rankings).some((r) => typeof r.ranking === "number")
  );

  if (status === "loading") return false;
  return isAuthenticated || guestHasRated;
}
