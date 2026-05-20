import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { isIAPAvailable } from '@/services/iap';

/**
 * TEMPORARY debug strip — diagnoses why Apple IAP detection fails on the
 * iOS TestFlight build (Stripe fallthrough → App Store Guideline 3.1.1).
 *
 * Shows two independent readings:
 *   - `core.*`   = values from the bundled @capacitor/core import
 *   - `bridge.*` = values from the native bridge object Capacitor injects
 *                  into window.Capacitor on the iOS WebView
 *
 * If core says 'web' but bridge says 'ios' → bundled core isn't seeing the
 * injected bridge (version/dedup issue). If both say 'web' / bridge missing
 * → the native bridge isn't injecting at all (WKWebView / server config).
 *
 * REMOVE this file + its mount in _app.tsx once IAP is fixed.
 */
export default function DebugCapacitor() {
  const [lines, setLines] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const w = window as unknown as { Capacitor?: Record<string, unknown> };
    const out = [
      `core.getPlatform():     ${safe(() => Capacitor.getPlatform())}`,
      `core.isNativePlatform():${safe(() => String(Capacitor.isNativePlatform()))}`,
      `window.Capacitor:       ${w.Capacitor ? 'PRESENT' : 'MISSING'}`,
      `bridge.getPlatform():   ${safe(() => String((w.Capacitor as any)?.getPlatform?.()))}`,
      `bridge.isNative:        ${safe(() => String((w.Capacitor as any)?.isNative))}`,
      `bridge.platform prop:   ${safe(() => String((w.Capacitor as any)?.platform))}`,
      `isIAPAvailable():       ${safe(() => String(isIAPAvailable()))}`,
      `UA: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 72) : 'n/a'}`,
    ];
    setLines(out);
  }, []);

  if (hidden) return null;

  return (
    <div
      onClick={() => setHidden(true)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: '#b80000',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.55',
        padding: '10px 12px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      {['CAPACITOR DEBUG  (tap to hide)', ...lines].join('\n')}
    </div>
  );
}

function safe(fn: () => string): string {
  try {
    return fn();
  } catch (e) {
    return 'ERR: ' + (e instanceof Error ? e.message : String(e));
  }
}
