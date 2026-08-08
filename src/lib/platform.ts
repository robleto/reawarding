import { Capacitor } from '@capacitor/core';

const NATIVE_APP_UA_TOKEN = 'ReawardingApp';

/** Client-side: true when running inside the wrapped native app (Capacitor), false on web. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Server-side: true when the request came from the wrapped native app's WebView. */
export function isNativeRequest(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(NATIVE_APP_UA_TOKEN);
}
