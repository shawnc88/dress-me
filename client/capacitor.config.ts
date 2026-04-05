import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.bewithmeapp.app',
  appName: 'Be With Me',
  // Load the deployed web app — not a local build
  server: {
    url: 'https://bewithmeapp.me',
    cleartext: false,
    // Allow navigation to external URLs (Stripe checkout, Apple auth, etc.)
    allowNavigation: [
      'bewithmeapp.me',
      '*.bewithmeapp.me',
      'checkout.stripe.com',
      'appleid.apple.com',
      '*.livekit.cloud',
    ],
  },
  ios: {
    // Allow inline media playback (required for live streams + reels)
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic',
    scheme: 'Be With Me',
    // Prefer main thread for smooth scrolling
    preferredContentMode: 'mobile',
    // WKWebView configuration for native feel
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Don't auto-hide — we hide manually after web view loads
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#070707',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      launchFadeOutDuration: 300,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#070707',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
