import { isNative } from '@/utils/platform';

/**
 * PWA plumbing — service worker registration with a remote kill-switch.
 *
 * Design constraints (do not relax):
 *   - WEB ONLY. Never runs inside the native Capacitor shell — the iOS
 *     binary is a webview of prod and must be 100% unaffected.
 *   - Defensive. Feature-detects everything, swallows every error; a PWA
 *     nicety must never crash the app on an old browser.
 *   - Kill-switch first. Before registering, checks /sw-disable. Deploying
 *     any file at client/public/sw-disable (making /sw-disable return 200)
 *     unregisters the service worker on every client's next page load.
 *     The SW itself performs the same check on activate (see public/sw.js).
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Never touch service workers inside the native Capacitor webview.
  if (isNative()) return;

  try {
    const res = await fetch('/sw-disable', { cache: 'no-store' });
    if (res.ok) {
      // Kill-switch engaged — tear down every registration and stop.
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      return;
    }
  } catch {
    // Can't reach the kill-switch flag (offline/flaky) — fall through and
    // register anyway; the SW re-checks the flag on every activation.
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Registration failure is non-fatal — the app works fine without a SW.
  }
}
