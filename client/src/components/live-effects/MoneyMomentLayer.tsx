import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket, getSocket } from '@/utils/socket';
import { getStoredUser } from '@/utils/authUser';
import { haptic } from '@/utils/native';
import { track } from '@/lib/analytics';

// ─── Money moments — CREATOR-ONLY overlays ──────────────────────
// A gift is an abstract coin count until the creator sees it as money.
// "+$2.38 — Amira sent a Crown", in real dollars, in real time — plus the
// two celebrations that decide whether a creator believes the platform is
// real: their FIRST gift ever, and their first full dollar.

const PAYOUT_RATE = 210; // threads per $1 — mirror of server CREATOR_PAYOUT_RATE

interface MoneyToast {
  id: number;
  usd: string;
  sender: string;
  giftName: string;
}

const GIFT_NAMES: Record<string, string> = {
  heart: 'a Heart', rose: 'a Rose', outfit: 'a Star', spotlight: 'a Spotlight',
  fireworks: 'Fireworks', crown: 'a Crown', diamond: 'a Diamond',
};

export function MoneyMomentLayer({ streamId }: { streamId?: string }) {
  const [toasts, setToasts] = useState<MoneyToast[]>([]);
  const [bigMoment, setBigMoment] = useState<'first-gift' | 'first-dollar' | null>(null);

  useEffect(() => {
    if (!streamId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const me = getStoredUser();
    if (!token || !me?.id) return;

    const socket = getSocket() ?? connectSocket(token);

    const onGift = (data: {
      streamId?: string;
      sender: string;
      giftType: string;
      threads: number;
      creatorUserId?: string;
      firstGiftForCreator?: boolean;
      firstDollarForCreator?: boolean;
    }) => {
      if (data.streamId && data.streamId !== streamId) return;
      // Creator-only surface — viewers already get the gift spectacle.
      if (!data.creatorUserId || data.creatorUserId !== me.id) return;

      const usd = (data.threads / PAYOUT_RATE).toFixed(2);
      const toast: MoneyToast = {
        id: Date.now() + Math.random(),
        usd,
        sender: data.sender,
        giftName: GIFT_NAMES[data.giftType] || data.giftType,
      };
      setToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 4200);

      if (data.firstGiftForCreator) {
        haptic('heavy');
        setBigMoment('first-gift');
        track('first_gift_received', { threads: data.threads });
        setTimeout(() => setBigMoment((m) => (m === 'first-gift' ? null : m)), 5000);
      } else if (data.firstDollarForCreator) {
        haptic('heavy');
        setBigMoment('first-dollar');
        track('first_dollar_earned', {});
        setTimeout(() => setBigMoment((m) => (m === 'first-dollar' ? null : m)), 5000);
      }
    };

    socket.on('gift-received', onGift);
    return () => { socket.off('gift-received', onGift); };
  }, [streamId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Real-dollar toasts — top-right, money-green, stack of 3 */}
      <div className="absolute top-28 right-3 flex flex-col items-end gap-1.5 safe-area-pt">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="rounded-2xl bg-ink-950/80 backdrop-blur-xl border border-accent-green/40 shadow-glow-green px-3.5 py-2 text-right"
            >
              <p className="text-accent-green font-extrabold tracking-tight text-base leading-tight tabular-nums">
                +${t.usd}
              </p>
              <p className="text-primary text-[11px] font-semibold">
                {t.sender} sent {t.giftName}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* First gift / first dollar — full-screen, once, loudly */}
      <AnimatePresence>
        {bigMoment && (
          <motion.div
            key={bigMoment}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-center px-8"
            >
              <motion.p
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: 2 }}
                className="text-7xl mb-5"
                aria-hidden
              >
                {bigMoment === 'first-gift' ? '🎁' : '💵'}
              </motion.p>
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent-green/90 mb-2">
                {bigMoment === 'first-gift' ? 'It happened' : 'Milestone'}
              </p>
              <h2 className="font-extrabold tracking-tight text-4xl text-white leading-[1.05] mb-3">
                {bigMoment === 'first-gift' ? (
                  <>Your first <span className="text-celebration">gift</span></>
                ) : (
                  <>Your first <span className="text-accent-green">dollar</span></>
                )}
              </h2>
              <p className="text-primary text-sm max-w-[260px] mx-auto leading-relaxed">
                {bigMoment === 'first-gift'
                  ? 'Someone just spent real money on you. Say their name out loud — that’s how the next one happens.'
                  : 'Earned live, on your own stage. It compounds from here.'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
