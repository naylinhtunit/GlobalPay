import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalpay.app',
  appName: 'GlobalPay',
  webDir: 'out',
  server: {
    // For dev: use live URL (no need for static export). For prod APK direct download we build out/ then copy.
    androidScheme: 'https'
  }
};

export default config;
