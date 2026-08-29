import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalpay.app',
  appName: 'GlobalPay',
  webDir: 'out',
  server: {
    // For dev: use live URL (no need for static export). For prod APK direct download we build out/ then copy.
    androidScheme: 'https',
    // Native apps start on the sign-in screen instead of briefly rendering the
    // public website landing page and redirecting after JavaScript initializes.
    // Use the exported HTML file explicitly. Capacitor's local server treats a
    // path without a file extension as an SPA route and serves the root page.
    appStartPath: '/login/index.html'
  }
};

export default config;
