import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reawarding.app',
  appName: 'Reawarding',
  webDir: 'public',
  server: {
    url: 'https://reawarding.com',
    cleartext: false,
  },
  ios: {
    appendUserAgent: 'ReawardingApp',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0C0A08',
      showSpinner: false,
    },
  },
};

export default config;
