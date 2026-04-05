import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

const GIFT_EMOJIS: Record<string, string> = {
  heart: '❤️', rose: '🌹', outfit: '👗',
  spotlight: '🔥', crown: '👑', diamond: '💎',
};

/**
 * Big animated callout that appears at the top of the stream when
 * someone sends a high-value gift (50+ threads).
 * Creates FOMO and social proof for other viewers.
 */
export function LiveGiftCallout() {
  const [callout, setCallout] = useState<{ name: string; emoji: string; threads: number } | null>(null);
  const messages = useChatStore(s => s.messages);
  const { track } = useMonetizationEvents();

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'gift' || !last.threads || last.threads < 50) return;

    const emoji = GIFT_EMOJIS[last.giftType || ''] || '🎁';
    setCallout({ name: last.displayName, emoji, threads: last.threads });
    track('gift_callout_seen', { threads: last.threads, giftType: last.giftType });

    const timer = setTimeout(() => setCallout(null), 4000);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <AnimatePresence>
      {callout && (
        <motion.div
          key={`callout-${Date.now()}`}
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 15 }}
          className="absolute top-20 left-4 right-4 z-40 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-amber-500/30 backdrop-blur-xl rounded-2xl p-3 border border-amber-400/30 text-center">
            <p className="text-2xl mb-1">{callout.emoji}</p>
            <p className="text-amber-200 text-sm font-extrabold">
              {callout.name} sent {callout.threads.toLocaleString()} threads!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
