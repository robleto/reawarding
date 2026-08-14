'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

const CUSTOM_SCHEME_PREFIX = 'com.reawarding.app://';

// OAuth (Apple, GitHub) is completed in a native ASWebAuthenticationSession
// (via @capacitor/browser), not the app's main WebView, because the WKWebView
// can lose the PKCE code_verifier cookie across the cross-domain redirect
// chain. That session redirects back to this custom URL scheme; we translate
// it back to the real reawarding.com URL and navigate the main WebView there,
// where the original code_verifier cookie is still intact.
export function NativeOAuthBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/browser'),
      ]);

      const sub = await App.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith(CUSTOM_SCHEME_PREFIX)) return;

        Browser.close().catch(() => {});
        const redirectUrl = url.replace(CUSTOM_SCHEME_PREFIX, 'https://reawarding.com/');
        window.location.href = redirectUrl;
      });
      removeListener = () => sub.remove();
    })();

    return () => removeListener?.();
  }, []);

  return null;
}
