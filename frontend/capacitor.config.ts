import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aspeaksphere.app',
  appName: 'ASpeakSphere',
  webDir: 'out',

  android: {
    allowMixedContent: true
  },

  plugins: {
    // Only Google is used — disabling the rest keeps their native SDKs
    // (Facebook, Twitter) out of the APK entirely.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;