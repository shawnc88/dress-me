import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { isNative } from '@/utils/platform';

/**
 * "Add Be With Me to your home screen" — PWA install prompt.
 *
 * Only ever appears where Chrome fires `beforeinstallprompt` (Android +
 * desktop Chrome/Edge). It can never appear on iOS: Safari/WKWebView do not
 * fire the event, and we additionally hard-suppress inside the native
 * Capacitor shell and when already running as an installed PWA.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'bwm_install_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // re-offer after 30 days

function isRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Web-only nicety — never inside the Capacitor webview, never when the
    // PWA is already installed, never during a dismissal cooldown.
    if (typeof window === 'undefined') return;
    if (isNative() || isStandalone() || isRecentlyDismissed()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // suppress Chrome's mini-infobar; we show our own UI
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setInstallEvent(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'dismissed') {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {}
      }
    } catch {}
    setInstallEvent(null);
  }

  return (
    <AnimatePresence>
      {installEvent && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 left-0 right-0 z-40 px-4 safe-area-pb pointer-events-none"
        >
          <div className="max-w-[430px] mx-auto pointer-events-auto relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.1] to-black/85 backdrop-blur-2xl shadow-2xl p-4">
            {/* neon spectrum hairline crown */}
            <div className="pointer-events-none absolute top-0 inset-x-0 h-px gradient-celebration opacity-50" aria-hidden />
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center transition hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt=""
                className="w-11 h-11 rounded-2xl border border-white/10 flex-shrink-0"
              />
              <div className="flex-1 min-w-0 pr-5">
                <p className="text-white text-sm font-bold tracking-tight">
                  Add Be With Me to your home screen
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  Full screen, one tap away — no browser bar.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={install}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-brand-500 to-violet-deep text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-glow min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                Install
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
