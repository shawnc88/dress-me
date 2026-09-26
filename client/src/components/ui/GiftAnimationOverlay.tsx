import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket, getSocket } from '@/utils/socket';
import { useGiftAnimation } from '@/components/3d/useGiftAnimation';
import { getGift, type GiftIntensity } from '@/lib/liveEffects/catalog';
import type { LottiePlay } from '@/components/live-effects/LottieEffectsLayer';
import { haptic } from '@/utils/native';

// Lazy-load the 3D scene — zero cost until first gift triggers it
const GiftScene = lazy(() =>
  import('@/components/3d/GiftScene').then((m) => ({ default: m.GiftScene }))
);

// Lazy-load the Lottie layer — lottie-react + JSON load only on first lottie gift
const LottieEffectsLayer = lazy(() =>
  import('@/components/live-effects/LottieEffectsLayer').then((m) => ({ default: m.LottieEffectsLayer }))
);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface GiftAnimation {
  id: number;
  emoji: string;
  senderName: string;
  giftName: string;
  giftType: string;
  threads: number;
  /** Celebration-ladder rung from the catalog — decides the whole treatment. */
  intensity: GiftIntensity;
}

const GIFT_EMOJI: Record<string, string> = {
  heart: '❤️', rose: '🌹', outfit: '👗', spotlight: '🔥', fireworks: '🎆', crown: '👑', diamond: '💎',
};

const GIFT_NAMES: Record<string, string> = {
  heart: 'Heart', rose: 'Rose', outfit: 'Outfit', spotlight: 'Spotlight', fireworks: 'Fireworks', crown: 'VIP Crown', diamond: 'Diamond',
};

/** Ladder → haptic weight. Escalation must be FELT, not just seen. */
const INTENSITY_HAPTIC: Record<GiftIntensity, 'light' | 'medium' | 'heavy' | null> = {
  float: null,
  burst: 'light',
  sweep: 'medium',
  takeover: 'heavy',
  'takeover-pin': 'heavy',
};

/** How long each rung stays on screen. */
const INTENSITY_TTL: Record<GiftIntensity, number> = {
  float: 2200,
  burst: 2800,
  sweep: 1800,
  takeover: 2600,
  'takeover-pin': 3000,
};

interface Props {
  streamId?: string;
}

export function GiftAnimationOverlay({ streamId }: Props) {
  const [animations, setAnimations] = useState<GiftAnimation[]>([]);
  const [lottiePlays, setLottiePlays] = useState<LottiePlay[]>([]);
  const [pinned, setPinned] = useState<{ id: number; senderName: string; emoji: string } | null>(null);
  const lottieIdRef = useRef(0);

  const removeLottiePlay = useCallback((id: number) => {
    setLottiePlays((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const {
    animations: animations3D,
    trigger: trigger3D,
    latestSender,
    latestCombo,
  } = useGiftAnimation();

  useEffect(() => {
    if (!streamId) return;

    // Reuse the shared authenticated stream socket (useStreamSocket owns the
    // connection + join-stream); here we only subscribe to gift broadcasts.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = getSocket() ?? connectSocket(token);

    const onGift = (data: { streamId?: string; sender: string; giftType: string; threads: number; message?: string; avatarUrl?: string }) => {
      // The shared socket can linger in a previous room; ignore gifts that
      // belong to a different stream so effects don't leak across rooms.
      if (data.streamId && data.streamId !== streamId) return;
      const gift = getGift(data.giftType);
      const anim: GiftAnimation = {
        id: Date.now() + Math.random(),
        emoji: GIFT_EMOJI[data.giftType] || '🎁',
        senderName: data.sender,
        giftName: GIFT_NAMES[data.giftType] || data.giftType,
        giftType: data.giftType,
        threads: data.threads,
        intensity: gift.intensity,
      };

      // The ladder is felt, not just seen.
      const weight = INTENSITY_HAPTIC[gift.intensity];
      if (weight) haptic(weight);

      // Hybrid dispatch: lottie gifts play a 2D Lottie burst; r3f gifts keep
      // the existing hero 3D pipeline (GiftHud sender callout + particle burst).
      const renderer = getGift(data.giftType).renderer;
      if (renderer === 'lottie') {
        // Lottie gifts: play the 2D flourish (skip the 3D scene). Honor reduced motion.
        if (!prefersReducedMotion()) {
          const id = ++lottieIdRef.current;
          setLottiePlays((prev) => [...prev.slice(-3), { id, giftId: data.giftType }]);
          // Safety cleanup in case onComplete doesn't fire (e.g. backgrounded tab).
          setTimeout(() => removeLottiePlay(id), 2600);
        }
      } else {
        // r3f gifts (crown, diamond): existing hero 3D pipeline, unchanged.
        trigger3D(data.giftType, {
          username: data.sender,
          avatarUrl: data.avatarUrl,
        });
      }

      setAnimations((prev) => [...prev, anim]);
      setTimeout(
        () => setAnimations((prev) => prev.filter((a) => a.id !== anim.id)),
        INTENSITY_TTL[gift.intensity]
      );

      // Diamond: 10-second pinned banner — status the whole room sees.
      if (gift.intensity === 'takeover-pin') {
        const pin = { id: anim.id, senderName: data.sender, emoji: anim.emoji };
        setPinned(pin);
        setTimeout(() => setPinned((p) => (p?.id === pin.id ? null : p)), 10000);
      }
    };

    socket.on('gift-received', onGift);

    return () => {
      socket.off('gift-received', onGift);
    };
  }, [streamId, trigger3D, removeLottiePlay]);

  return (
    <>
      {/* ─── 3D Gift Animations (R3F Canvas) ─── */}
      {/* Floaters/HUD render only while a gift is active — no idle drift. */}
      <Suspense fallback={null}>
        <GiftScene
          animations={animations3D}
          latestSender={latestSender}
          latestCombo={latestCombo}
          ambient={animations3D.length > 0}
        />
      </Suspense>

      {/* ─── Lottie Gift Bursts (common gifts, hybrid dispatch) ─── */}
      {lottiePlays.length > 0 && (
        <Suspense fallback={null}>
          <LottieEffectsLayer plays={lottiePlays} onDone={removeLottiePlay} />
        </Suspense>
      )}

      {/* ─── 2D Overlays (sender info, float bubbles) ─── */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {/* Room dim — a takeover OWNS the room for a beat. Peaks need valleys. */}
        <AnimatePresence>
          {animations.some((a) => a.intensity === 'takeover' || a.intensity === 'takeover-pin') &&
            !prefersReducedMotion() && (
              <motion.div
                key="gift-dim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 bg-black"
              />
            )}
        </AnimatePresence>

        {/* Diamond pin — 10s of top-of-room status */}
        <AnimatePresence>
          {pinned && (
            <motion.div
              key={`pin-${pinned.id}`}
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-2 rounded-full bg-ink-950/80 backdrop-blur-xl border border-accent-cyan/50 shadow-glow-cyan px-4 py-2">
                <span className="text-lg" aria-hidden>{pinned.emoji}</span>
                <span className="text-white text-[13px] font-bold">{pinned.senderName}</span>
                <span className="text-accent-cyan text-[11px] font-bold uppercase tracking-[0.14em]">Top gift</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {animations.map((anim) => {
            if (anim.intensity === 'takeover' || anim.intensity === 'takeover-pin') {
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

            if (anim.intensity === 'sweep') {
              // Half-screen sweep with the sender's name — the statement rung.
              return (
                <motion.div
                  key={anim.id}
                  initial={{ opacity: 0, x: '-60%' }}
                  animate={{ opacity: [0, 1, 1, 0], x: ['-60%', '0%', '4%', '70%'] }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-1/3 left-0 right-0 flex justify-center"
                >
                  <div className="flex items-center gap-3 rounded-full bg-ink-950/70 backdrop-blur-xl border border-white/20 shadow-glow px-6 py-3">
                    <span className="text-4xl" aria-hidden>{anim.emoji}</span>
                    <div>
                      <p className="text-white font-extrabold tracking-tight text-base leading-tight">{anim.senderName}</p>
                      <p className="text-white/70 text-[12px] font-semibold">sent {anim.giftName}</p>
                    </div>
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
                    <p className="text-white/60 text-[11px]">sent {anim.giftName}</p>
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
