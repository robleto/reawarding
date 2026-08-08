'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

// Matches the app's warm dark canvas (#0C0A08, see .impeccable.md) so the
// status bar doesn't flash white/light before the WebView paints.
export function NativeStatusBarBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;

    (async () => {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0C0A08' });
    })();
  }, []);

  return null;
}
