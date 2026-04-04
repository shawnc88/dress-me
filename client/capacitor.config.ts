import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.dressmeapp.app',
  appName: 'Dress Me',
  // Load the deployed web app — not a local build
  server: {
    url: 'https://dressmeapp.me',
    cleartext: false,
  },
  ios: {
    // Allow inline media playback (required for live streams)
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic',
    scheme: 'Dress Me',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#070707',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#070707',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
