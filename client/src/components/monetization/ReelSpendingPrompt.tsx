import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Gift, X, Star } from 'lucide-react';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

interface Props {
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  watchTimeMs: number; // How long they've been watching this reel
  isActive: boolean;
}

/**
 * Contextual prompt shown on reels after engagement thresholds.
 * Shows subscribe/gift CTAs without blocking the content.
 */
export function ReelSpendingPrompt({ creatorId, creatorName, creatorUsername, watchTimeMs, isActive }: Props) {
  const [prompt, setPrompt] = useState<'subscribe' | 'gift' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const firedRef = useRef(false);
  const { track } = useMonetizationEvents();

  useEffect(() => {
    if (!isActive || dismissed || firedRef.current) return;

    // Show subscribe prompt after 15s of watching a single reel
    if (watchTimeMs >= 15000 && !firedRef.current) {
      firedRef.current = true;
      // Check if already subscribed
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/api/fan-subscriptions/check/${creatorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.subscription) {
            setPrompt('subscribe');
            track('vip_prompt_shown', { creatorId, source: 'reel' });
          }
        })
        .catch(() => {});
    }
  }, [watchTimeMs, isActive, dismissed, creatorId, track]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!prompt) return;
    const timer = setTimeout(() => {
      setPrompt(null);
      track('vip_prompt_dismissed', { creatorId, source: 'reel', auto: true });
    }, 8000);
    return () => clearTimeout(timer);
  }, [prompt, creatorId, track]);

  if (!prompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute bottom-32 left-4 right-16 z-40"
      >
        <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-3 border border-violet-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold">Love {creatorName}'s content?</p>
            <p className="text-white/40 text-[10px]">Subscribe for exclusive access & Suite priority</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              track('vip_prompt_clicked', { creatorId, source: 'reel' });
              window.location.href = `/profile/${creatorUsername}`;
            }}
            className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold flex-shrink-0"
          >
            Subscribe
          </motion.button>
          <button
            onClick={() => {
              setDismissed(true);
              track('vip_prompt_dismissed', { creatorId, source: 'reel' });
            }}
            className="text-white/20 text-sm leading-none"
          >
            &times;
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
