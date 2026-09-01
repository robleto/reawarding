import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reawarding.app',
  appName: 'Reawarding',
  webDir: 'public',
  // WKWebView canvas while the remote page loads — without this the shell
  // flashes white between the splash screen and first paint.
  backgroundColor: '#0C0A08',
  server: {
    // TEMPORARY — pointed at the local dev server to keep testing the guest
    // year-walk (docs/design/first-rating-payoff.md) in the simulator before
    // it's deployed. REVERT to 'https://reawarding.com' and cleartext: false
    // before any real build or commit — this exact swap was accidentally
    // committed once already (1c7b7a1, reverted in 0755574). Don't `git add`
    // this file while it looks like this.
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
