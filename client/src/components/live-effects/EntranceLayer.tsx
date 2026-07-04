import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { connectSocket, getSocket } from '@/utils/socket';
import { getTier, type TierDef } from '@/lib/liveEffects/catalog';

const EntranceFlourish = lazy(() =>
  import('./EntranceFlourish').then((m) => ({ default: m.EntranceFlourish }))
);

/**
 * EntranceLayer — Bigo/Tango-style "VIP just arrived" entrance effects.
 *
 * Subscribes to the REAL `viewer:joined` socket event (server:
 * engagement.ts → `io.to('stream:${id}').emit('viewer:joined', { user, tier })`).
 * Only subscribers with a tier get an entrance (keeps a busy room from
 * spamming banners for every guest). Flashier the higher the tier.
 *
 * Decorative: `pointer-events-none`, honors reduced-motion (static, no slide),
 * asset-free (framer-motion + the universal accent palette). The hybrid pass
 * later swaps in Lottie/GLB flourishes per tier via the same queue.
 */

interface ViewerJoined {
  streamId: string;
  user: { id: string | null; username: string; displayName: string; avatarUrl: string | null };
  tier?: string | null;
  isGuest?: boolean;
  at?: string;
}

interface Entrance {
  key: number;
  name: string;
  avatarUrl: string | null;
  tier: TierDef;
}

interface Props {
  streamId?: string;
}

export function EntranceLayer({ streamId }: Props) {
  const [entrances, setEntrances] = useState<Entrance[]>([]);
  const reduceMotion = useReducedMotion();
  const counter = useRef(0);

  useEffect(() => {
    if (!streamId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    // Reuse the shared authenticated stream socket (same one gifts/chat use).
    const socket = getSocket() ?? connectSocket(token);

    const onJoin = (data: ViewerJoined) => {
      if (!data || data.isGuest) return;            // no entrance for anonymous guests
      const tier = getTier(data.tier);
      if (!tier || !tier.entrance) return;          // only tiered subscribers get a moment

      const entrance: Entrance = {
        key: ++counter.current,
        name: data.user?.displayName || data.user?.username || 'A member',
        avatarUrl: data.user?.avatarUrl ?? null,
        tier,
      };
      // Cap the queue so a raid can't flood the screen.
      setEntrances((prev) => [...prev.slice(-2), entrance]);
      const ttl = tier.rank >= 3 ? 5200 : 4200;
      setTimeout(() => {
        setEntrances((prev) => prev.filter((e) => e.key !== entrance.key));
      }, ttl);
    };

    socket.on('viewer:joined', onJoin);
    return () => {
      socket.off('viewer:joined', onJoin);
    };
  }, [streamId]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[22%] z-[45] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {entrances.map((e) => (
          <motion.div
            key={e.key}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -80, scale: 0.9 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative flex items-center justify-center"
          >
            {/* Lottie flourish blooms behind the pill (lazy; VIP+ only) */}
            {!reduceMotion && (e.tier.id === 'VIP' || e.tier.id === 'INNER_CIRCLE') && (
              <Suspense fallback={null}>
                <EntranceFlourish tier={e.tier.id} />
              </Suspense>
            )}

            <div
              className={`relative z-[1] flex items-center gap-3 overflow-hidden rounded-full border py-1.5 pl-1.5 pr-5 backdrop-blur-xl ${e.tier.glow}`}
              style={{
                borderColor: `${e.tier.color}66`,
                background: `linear-gradient(100deg, ${e.tier.color}2e 0%, rgba(10,10,12,0.72) 55%)`,
              }}
            >
              {/* sheen sweep (skipped under reduced motion) */}
              {!reduceMotion && (
                <motion.span
                  aria-hidden
                  initial={{ x: '-120%' }}
                  animate={{ x: '220%' }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/25 blur-md"
                />
              )}

              {/* avatar */}
              <div
                className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2"
                style={{ boxShadow: `0 0 12px ${e.tier.color}`, ['--tw-ring-color' as any]: e.tier.color }}
              >
                {e.avatarUrl ? (
                  <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="leading-tight">
                <p className="text-[13px] font-bold text-white">
                  {e.name} <span className="font-medium text-white/70">joined</span>
                </p>
                <p
                  className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
                  style={{ color: e.tier.color }}
                >
                  {e.tier.label}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default EntranceLayer;
