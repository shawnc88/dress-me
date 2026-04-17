import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket, getSocket } from '@/utils/socket';
import { useGiftAnimation } from '@/components/3d/useGiftAnimation';

// Lazy-load the 3D scene — zero cost until first gift triggers it
const GiftScene = lazy(() =>
  import('@/components/3d/GiftScene').then((m) => ({ default: m.GiftScene }))
);

interface GiftAnimation {
  id: number;
  emoji: string;
  senderName: string;
  giftName: string;
  giftType: string;
  threads: number;
  effect: 'float' | 'fullscreen';
}

const GIFT_EMOJI: Record<string, string> = {
  heart: '❤️', rose: '🌹', outfit: '👗', spotlight: '🔥', crown: '👑', diamond: '💎',
};

const GIFT_NAMES: Record<string, string> = {
  heart: 'Heart', rose: 'Rose', outfit: 'Outfit', spotlight: 'Spotlight', crown: 'VIP Crown', diamond: 'Diamond',
};

interface Props {
  streamId?: string;
}

export function GiftAnimationOverlay({ streamId }: Props) {
  const [animations, setAnimations] = useState<GiftAnimation[]>([]);
  const { animations: animations3D, trigger: trigger3D } = useGiftAnimation();

  useEffect(() => {
    if (!streamId) return;

    // Reuse the shared authenticated stream socket (useStreamSocket owns the
    // connection + join-stream); here we only subscribe to gift broadcasts.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = getSocket() ?? connectSocket(token);

    const onGift = (data: { sender: string; giftType: string; threads: number; message?: string }) => {
      const anim: GiftAnimation = {
        id: Date.now() + Math.random(),
        emoji: GIFT_EMOJI[data.giftType] || '🎁',
        senderName: data.sender,
        giftName: GIFT_NAMES[data.giftType] || data.giftType,
        giftType: data.giftType,
        threads: data.threads,
        effect: data.threads >= 500 ? 'fullscreen' : 'float',
      };

      trigger3D(data.giftType);

      setAnimations((prev) => [...prev, anim]);
      setTimeout(() => setAnimations((prev) => prev.filter((a) => a.id !== anim.id)), 3500);
    };

    socket.on('gift-received', onGift);

    return () => {
      socket.off('gift-received', onGift);
    };
  }, [streamId, trigger3D]);

  return (
    <>
      {/* ─── 3D Gift Animations (R3F Canvas) ─── */}
      <Suspense fallback={null}>
        <GiftScene animations={animations3D} />
      </Suspense>

      {/* ─── 2D Overlays (sender info, float bubbles) ─── */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {animations.map((anim) => {
            if (anim.effect === 'fullscreen') {
              return (
                <motion.div
                  key={anim.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1, repeat: 1 }}
                      className="text-7xl mb-3"
                    >
                      {anim.emoji}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-3 inline-block"
                    >
                      <p className="text-amber-400 font-bold text-sm">{anim.senderName}</p>
                      <p className="text-white text-xs">sent {anim.giftName} ({anim.threads} threads)</p>
                    </motion.div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={anim.id}
                initial={{ opacity: 0, x: 20, y: '70%' }}
                animate={{ opacity: [0, 1, 1, 0], x: 20, y: ['70%', '60%', '50%', '40%'] }}
                transition={{ duration: 3, ease: 'easeOut' }}
                className="absolute left-4"
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full pl-2 pr-4 py-1.5 flex items-center gap-2">
                  <span className="text-2xl">{anim.emoji}</span>
                  <div>
                    <p className="text-white text-xs font-bold">{anim.senderName}</p>
                    <p className="text-white/60 text-[10px]">sent {anim.giftName}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
