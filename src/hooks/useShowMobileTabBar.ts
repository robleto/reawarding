"use client";

import { useAuthState } from "@/hooks/useAuthState";

/**
 * Whether the bottom tab bar should render.
 *
 * Lives here rather than inline in AppShell because three things key off it —
 * the tab bar itself, `main`'s bottom padding, and BackToTopButton's offset —
 * and they must agree, or the layout reserves space for a bar that isn't there.
 *
 * The rule: **signed in only.** Guests get no tab bar, at any point.
 *
 * Reverted 2026-08-24. This briefly showed guests a tab bar once they'd rated
 * something, on the theory that they'd earned navigation. In practice it broke
 * the year-walk (docs/design/first-rating-payoff.md): the fixed bar sits over
 * the bottom of the ledger region and hid the "Next: {year}" button the walk
 * depends on to advance. Explicit call: not for a not-logged-in user, at least
 * not yet — a guest's path forward is the search box and the walk, not a nav
 * bar to Films/Lists.
 *
 * If this comes back, it needs the ledger region to reserve real bottom
 * padding for the bar first, not just a rating-count trigger.
 */
export function useShowMobileTabBar(): boolean {
  const { isAuthenticated } = useAuthState();
  return isAuthenticated;
}
