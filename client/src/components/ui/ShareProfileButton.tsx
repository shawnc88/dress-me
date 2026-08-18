import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Check } from 'lucide-react';

// Canonical public origin — profile links must work outside the app (texts,
// bios, QR cards), so never derive this from window.location (Capacitor
// serves from capacitor:// origins).
const SITE_URL = 'https://bewithme.live';

export function shareProfileUrl(username: string): string {
  return `${SITE_URL}/profile/${encodeURIComponent(username)}`;
}

/**
 * Share button for a profile: native share sheet where available (iOS webview
 * supports navigator.share), clipboard fallback with a brief "copied" state.
 */
export function ShareProfileButton({
  username,
  displayName,
  className,
  iconClassName = 'w-5 h-5',
  label,
}: {
  username: string;
  displayName?: string;
  className?: string;
  iconClassName?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = shareProfileUrl(username);
    const name = displayName || `@${username}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} on BeWithMe Live`, url });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user closed the sheet
        // fall through to clipboard on any other failure
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={share}
      aria-label="Share profile"
      className={className}
    >
      {copied ? (
        <span className="flex items-center justify-center gap-1.5">
          <Check className={`${iconClassName} text-accent-green`} />
          {label ? 'Copied!' : null}
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1.5">
          <Share2 className={iconClassName} />
          {label || null}
        </span>
      )}
    </motion.button>
  );
}
