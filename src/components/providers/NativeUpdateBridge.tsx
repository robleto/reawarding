'use client';

import { useCallback, useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

// Keeps the native shell off stale JavaScript.
//
// The shell loads reawarding.com as a long-lived SPA: once it boots, client
// -side navigation never re-fetches the document, so a tester who leaves the
// app backgrounded for days keeps running whatever bundle they first loaded.
// Force-quitting fixes it, but real testers never do that.
//
// So on launch and on every return to the foreground we ask the server what
// build is currently deployed and compare it to the build baked into this
// bundle. A mismatch means we're stale — reload to pick up the new one.
//
// Native-only on purpose: browser tabs get fresh documents naturally, and an
// unexpected reload could cost someone form state on the website.

const GUARD_KEY = 'ra:reloaded-for-build';

export function NativeUpdateBridge() {
  const checkForUpdate = useCallback(async () => {
    const localBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!localBuildId) return;

    let serverBuildId: string | null = null;
    try {
      const res = await fetch('/api/build-id', { cache: 'no-store' });
      if (!res.ok) return;
      const data: unknown = await res.json();
      const value = (data as { buildId?: unknown })?.buildId;
      serverBuildId = typeof value === 'string' ? value : null;
    } catch {
      // Offline or the request failed — nothing to do. NativeOfflineGate
      // owns the offline experience; this bridge stays silent.
      return;
    }

    if (!serverBuildId || serverBuildId === localBuildId) return;

    // Loop guard: if the WebView keeps handing us the same cached document,
    // reloading again would never converge. Attempt at most once per
    // distinct server build per session.
    try {
      if (sessionStorage.getItem(GUARD_KEY) === serverBuildId) return;
      sessionStorage.setItem(GUARD_KEY, serverBuildId);
    } catch {
      // Private mode / storage unavailable — skip rather than risk a loop.
      return;
    }

    window.location.reload();
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    // Cold start can itself be served from the WebView cache.
    void checkForUpdate();

    let removeListener: (() => void) | undefined;
    (async () => {
      const { App } = await import('@capacitor/app');
      const sub = await App.addListener('appStateChange', ({ isActive }) => {
        // Returning to the foreground is the safe moment to swap the bundle:
        // the user has just come back and isn't mid-interaction.
        if (isActive) void checkForUpdate();
      });
      removeListener = () => sub.remove();
    })();

    return () => removeListener?.();
  }, [checkForUpdate]);

  return null;
}
