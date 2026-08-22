import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/utils/socket';
import { haptic } from '@/utils/native';

/**
 * GiftGoalBar — Twitch-Hype-Train-style community goal for the live room.
 * Fills as ANYONE gifts (listens on the shared socket's `gift-received`),
 * levels up through an escalating thread ladder, and celebrates each level.
 * Turns scattered gifting into a shared milestone a small room can rally
 * around — session-scoped by design (everyone sees the same events live).
 */

const LADDER = [50, 150, 400, 1000, 2500, 6000, 15000];

export function GiftGoalBar({ streamId }: { streamId: string }) {
  const [total, setTotal] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const levelRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onGift = (data: any) => {
      if (data?.streamId && data.streamId !== streamId) return;
      const threads = Number(data?.threads) || 0;
      if (threads <= 0) return;
      setTotal(t => t + threads);
    };
    socket.on('gift-received', onGift);
    // Only remove OUR listener — the socket is a shared singleton.
    return () => { socket.off('gift-received', onGift); };
  }, [streamId]);

  const level = LADDER.findIndex(m => total < m);
  const displayLevel = level === -1 ? LADDER.length : level;
  const target = level === -1 ? LADDER[LADDER.length - 1] : LADDER[level];
  const floor = displayLevel === 0 ? 0 : LADDER[displayLevel - 1];
  const pct = level === -1 ? 100 : Math.min(100, Math.round(((total - floor) / (target - floor)) * 100));

  // Level-up celebration
  useEffect(() => {
    if (displayLevel > levelRef.current) {
      levelRef.current = displayLevel;
      if (total > 0) {
        setCelebrating(true);
        haptic('medium');
        const t = setTimeout(() => setCelebrating(false), 2200);
        return () => clearTimeout(t);
      }
    }
  }, [displayLevel, total]);

  if (total === 0) return null; // appears with the first gift — no empty chrome

  return (
    <div className="pointer-events-none">
      <motion.div
        animate={celebrating ? { scale: [1, 1.06, 1] } : {}}
        className="mx-4 rounded-2xl bg-ink-950/60 backdrop-blur-xl border border-white/15 px-3.5 py-2"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
            <span aria-hidden>🎁</span> Room goal · Lv {displayLevel + (level === -1 ? 0 : 1)}
          </span>
          <span className="text-[11px] font-semibold text-amber-300">
            {total.toLocaleString()} / {target.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full rounded-full gradient-celebration"
          />
        </div>
      </motion.div>
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-1.5 text-center"
          >
            <span className="inline-block px-3 py-1 rounded-full gradient-celebration text-white text-[11px] font-bold shadow-glow">
              🎉 Goal level up — keep it going!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
