"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";

/** Query param that forces the native branch outside the real app shell. */
const OVERRIDE_PARAM = "native";
/** Sticky across client-side navigation within the tab. */
const OVERRIDE_KEY = "reawarding-native-override";

/**
 * Dev-only override for the native/web split.
 *
 * `Capacitor.isNativePlatform()` is false in any ordinary browser, so without
 * this the native logged-out screen (NativeGuestHome) is reachable only from a
 * real device or simulator — which in practice means it never gets browser
 * regression coverage. `?native=1` forces it on, `?native=0` forces it off
 * (useful for checking the web funnel from inside the shell).
 *
 * The choice is persisted to sessionStorage so it survives client-side
 * navigation, not just the initial load with the param attached.
 *
 * Inert in production: `process.env.NODE_ENV` is statically replaced at build
 * time, so this returns null before touching anything and the rest of the
 * function is unreachable in a production bundle.
 *
 * @returns the forced value, or null to defer to the real platform check.
 */
function readDevOverride(): boolean | null {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const param = new URLSearchParams(window.location.search).get(OVERRIDE_PARAM);
    if (param === "1" || param === "0") {
      const forced = param === "1";
      window.sessionStorage.setItem(OVERRIDE_KEY, String(forced));
      return forced;
    }
    const stored = window.sessionStorage.getItem(OVERRIDE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // Blocked storage or a non-browser context — fall through to the real check.
  }
  return null;
}

/**
 * Hydration-safe wrapper around `isNativeApp()`.
 *
 * `Capacitor.isNativePlatform()` is client-only — it returns false during SSR,
 * so reading it during the first render would emit web markup and then swap it
 * for the native screen on hydration. Callers that branch layout on this must
 * treat `null` as "not known yet" and hold their render, or the native app
 * flashes the web funnel on every cold start.
 */
export function useIsNativeApp(): boolean | null {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    setIsNative(readDevOverride() ?? isNativeApp());
  }, []);

  return isNative;
}
