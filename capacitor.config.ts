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
    appStartPath: '/login/'
  }
};

export default config;
