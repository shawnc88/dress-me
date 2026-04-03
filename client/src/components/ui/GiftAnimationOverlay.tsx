import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GiftAnimation {
  id: number;
  emoji: string;
  senderName: string;
  giftName: string;
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

  useEffect(() => {
    if (!streamId) return;

    const socket = io(API_URL, { transports: ['websocket', 'polling'] });

    socket.emit('join-stream', { streamId });

    socket.on('gift-received', (data: { sender: string; giftType: string; threads: number; message?: string }) => {
      const anim: GiftAnimation = {
        id: Date.now() + Math.random(),
        emoji: GIFT_EMOJI[data.giftType] || '🎁',
        senderName: data.sender,
        giftName: GIFT_NAMES[data.giftType] || data.giftType,
        threads: data.threads,
        effect: data.threads >= 500 ? 'fullscreen' : 'float',
      };
      setAnimations(prev => [...prev, anim]);
      setTimeout(() => setAnimations(prev => prev.filter(a => a.id !== anim.id)), 3500);
    });

    return () => {
      socket.off('gift-received');
      socket.disconnect();
    };
  }, [streamId]);

  return (
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
  );
}
