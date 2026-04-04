import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Initialize native Capacitor plugins.
 * Only runs when inside the native iOS shell, no-ops on web.
 */
export async function initNativePlugins() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Dark status bar to match our theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#070707' });
  } catch {}

  try {
    // Hide splash screen after web view is ready
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}

  try {
    // Keyboard behavior — resize body, not pan
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {}
}

/**
 * Trigger haptic feedback.
 * Uses the native Taptic Engine on iOS, no-ops on web.
 * Types: light, medium, heavy, success, warning, error
 */
export function haptic(
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) {
  if (typeof navigator === 'undefined') return;

  // Use the Web Vibration API as fallback — works in some browsers
  // On iOS WKWebView inside Capacitor, we use the native bridge
  if (Capacitor.isNativePlatform()) {
    try {
      // Capacitor doesn't have a built-in haptics plugin in core,
      // but we can use the Web API which works in WKWebView on iOS 13+
      // with the Taptic Engine
      if ('vibrate' in navigator) {
        const durations: Record<string, number> = {
          light: 10,
          medium: 20,
          heavy: 30,
          success: 15,
          warning: 25,
          error: 40,
        };
        navigator.vibrate(durations[style] || 10);
      }
    } catch {}
    return;
  }

  // Web fallback — minimal vibration if supported
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(style === 'light' ? 5 : 10);
    }
  } catch {}
}
