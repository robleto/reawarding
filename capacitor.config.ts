import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reawarding.app',
  appName: 'Reawarding',
  webDir: 'public',
  // WKWebView canvas while the remote page loads — without this the shell
  // flashes white between the splash screen and first paint.
  backgroundColor: '#0C0A08',
  server: {
    // TEMPORARY — local testing only, for the feature/lists-fullscreen-pager
    // branch. Points the simulator at the local `npm run dev` server instead
    // of production so the in-progress Lists changes are visible. Revert to
    // 'https://reawarding.com' / cleartext: false before merging.
    url: 'http://localhost:3000',
    cleartext: true,
    // Bundled fallback (public/offline.html) shown when the remote site
    // fails to load — covers cold-start offline, where the in-app
    // NativeOfflineGate JS never runs. Keep its APP_URL in sync with `url`.
    errorPath: 'offline.html',
  },
  ios: {
    appendUserAgent: 'ReawardingApp',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0C0A08',
      showSpinner: false,
    },
    // 'native' resizes the WebView frame with the keyboard so fixed bars
    // (header, tab bar) stay put. Flip to 'body' if device testing shows
    // the layout jumping when NavSearch or modal inputs focus.
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
