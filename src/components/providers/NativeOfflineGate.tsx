'use client';

import { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { isNativeApp } from '@/lib/platform';

// Native shell points at the remote site (capacitor.config.ts server.url), so
// losing the connection mid-session strands the WebView. This gate covers
// connection loss while the app is running; a cold start with no network
// never executes this JS at all — that case needs a native-side error page
// (docs/IPHONE_FEEL_AUDIT.md item 7 follow-up).
export function NativeOfflineGate() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      if (!cancelled) setOffline(!status.connected);
      const handle = await Network.addListener('networkStatusChange', (s) => {
        setOffline(!s.connected);
      });
      removeListener = () => handle.remove();
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  const retry = useCallback(async () => {
    setChecking(true);
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      setOffline(!status.connected);
    } finally {
      setChecking(false);
    }
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ backgroundColor: '#0C0A08' }}
      role="alert"
    >
      <WifiOff className="h-10 w-10 text-gray-500" aria-hidden="true" />
      <div>
        <h2 className="font-unbounded text-xl font-bold text-white mb-2">
          You&rsquo;re offline
        </h2>
        <p className="text-sm text-gray-400 max-w-xs">
          Reawarding needs a connection to load your ballots. Everything
          you&rsquo;ve saved is safe.
        </p>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={checking}
        className="px-6 py-2.5 rounded-lg bg-gold-500 text-black text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
      >
        {checking ? 'Checking…' : 'Try again'}
      </button>
    </div>
  );
}
