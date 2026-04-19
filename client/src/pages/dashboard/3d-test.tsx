import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Heart, Flame, Crown, Gem, Trash2, Gauge, Accessibility } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGiftAnimation, AnimationType } from '@/components/3d/useGiftAnimation';

type AuthState = 'hydrating' | 'unauthorized' | 'authorized';

// Lazy-load the Canvas so the page itself is cheap
const GiftScene = lazy(() =>
  import('@/components/3d/GiftScene').then((m) => ({ default: m.GiftScene }))
);

interface GiftButton {
  type: string;
  label: string;
  emoji: string;
  threads: number;
  icon: any;
  animation: AnimationType;
}

const GIFTS: GiftButton[] = [
  { type: 'heart',     label: 'Heart',     emoji: '❤️',  threads: 5,   icon: Heart,     animation: 'hearts'    },
  { type: 'rose',      label: 'Rose',      emoji: '🌹',  threads: 10,  icon: Heart,     animation: 'hearts'    },
  { type: 'outfit',    label: 'Outfit',    emoji: '👗',  threads: 50,  icon: Sparkles,  animation: 'explosion' },
  { type: 'spotlight', label: 'Spotlight', emoji: '🔥',  threads: 200, icon: Flame,     animation: 'explosion' },
  { type: 'crown',     label: 'VIP Crown', emoji: '👑',  threads: 500, icon: Crown,     animation: 'explosion' },
  { type: 'diamond',   label: 'Diamond',   emoji: '💎',  threads: 1000, icon: Gem,      animation: 'diamond'   },
];

/**
 * Dev-only 3D animation test page.
 *
 * Layout is intentionally split into a visible "stage" + controls so the
 * animations actually render where you can see them (vs being obscured by
 * the UI chrome).
 */
export default function ThreeDTestPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { animations, trigger, clear } = useGiftAnimation();
  const [fps, setFps] = useState(0);
  const [stressCount, setStressCount] = useState(0);
  const [authState, setAuthState] = useState<AuthState>('hydrating');

  // Gate the test lab to ADMIN / MODERATOR only. The page exposes internal
  // perf/animation tooling — not meant to be discoverable to regular users.
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
        setAuthState('authorized');
      } else {
        setAuthState('unauthorized');
        router.replace('/');
      }
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    useAuthStore.getState().hydrate();
  }, [user, router]);

  // Live FPS counter using requestAnimationFrame
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let frames = 0;

    function tick(now: number) {
      frames++;
      const elapsed = now - lastTime;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }, []);

  function fireGift(type: string) {
    trigger(type);
  }

  function stressTest() {
    setStressCount((c) => c + 1);
    const types = ['heart', 'rose', 'outfit', 'spotlight', 'crown', 'diamond'];
    types.forEach((type, i) => {
      setTimeout(() => trigger(type), i * 250);
    });
    setTimeout(() => {
      types.forEach((type, i) => {
        setTimeout(() => trigger(type), i * 250);
      });
    }, 2500);
  }

  if (authState === 'hydrating') {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white/60">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (authState === 'unauthorized') return null;

  return (
    <>
      <Head>
        <title>3D Animation Test · Be With Me</title>
      </Head>
      <div className="min-h-screen bg-[#0b0b0f] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <p className="text-violet-400 text-[10px] font-bold tracking-[0.2em] uppercase">Dev Tools</p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">3D Animation Test Lab</h1>
            </div>
            <button
              onClick={clear}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* ─── Metrics bar ─── */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <MetricCard
              icon={Gauge}
              label="FPS"
              value={`${fps}`}
              accent={fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              icon={Zap}
              label="Active"
              value={`${animations.length}`}
              accent="text-violet-400"
            />
            <MetricCard
              icon={Accessibility}
              label="Reduced Motion"
              value={reducedMotion ? 'ON' : 'off'}
              accent={reducedMotion ? 'text-amber-400' : 'text-white/60'}
            />
          </div>

          {/* ─── THE STAGE ───────────────────────────────
              This is where the 3D animations actually render.
              Portrait aspect to mimic a phone stream.
              GiftScene uses `absolute inset-0` so it fills this box. */}
          <div className="relative mx-auto w-full max-w-[420px] aspect-[9/16] rounded-3xl overflow-hidden border-2 border-white/10 bg-gradient-to-b from-violet-900/40 via-[#0b0b0f] to-brand-900/20 mb-5 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
            {/* Faux "stream" background so the black is broken up */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wider mb-3 animate-pulse">
                  ● LIVE · PREVIEW
                </div>
                <p className="text-white/30 text-xs max-w-[260px] px-6">
                  Fire a gift below — animation plays on this stage.
                </p>
              </div>
            </div>

            {/* 3D Canvas — ONLY fills this stage, not the whole page */}
            <Suspense fallback={null}>
              <GiftScene animations={animations} />
            </Suspense>

            {/* Little "active" badge inside stage */}
            {animations.length > 0 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-violet-300 border border-violet-500/30 z-[70]">
                {animations.length} active
              </div>
            )}
          </div>

          {/* ─── Gift buttons ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {GIFTS.map((g) => {
              const Icon = g.icon;
              return (
                <motion.button
                  key={g.type}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => fireGift(g.type)}
                  className="group flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 transition-all text-left"
                >
                  <div className="text-2xl">{g.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold">{g.label}</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wider">
                      {g.animation}
                    </div>
                  </div>
                  <Icon className="w-3.5 h-3.5 text-white/30 group-hover:text-violet-400 transition-colors" />
                </motion.button>
              );
            })}
          </div>

          {/* ─── Stress test ─── */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={stressTest}
            className="w-full p-3.5 rounded-xl bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-red-500/30 text-white font-bold flex items-center justify-center gap-2 mb-4"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm">Stress Test: 12 gifts in 5 seconds</span>
            {stressCount > 0 && <span className="text-xs text-white/50">({stressCount}×)</span>}
          </motion.button>

          {/* ─── What to check ─── */}
          <details className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs">
            <summary className="cursor-pointer font-bold text-white/70">What to check</summary>
            <ul className="text-white/50 mt-2 space-y-1 list-disc list-inside pl-1">
              <li>Hearts → floating red/pink hearts rising through the stage</li>
              <li>Rose → same animation as hearts</li>
              <li>Outfit / Spotlight / Crown → coin explosion bursts (bronze / silver / gold)</li>
              <li>Diamond → spinning cyan crystal with sparkle ring</li>
              <li>FPS should stay 55+ through stress test on desktop, 45+ on iPhone 12+</li>
              <li>Enable OS reduced-motion → all 3D is skipped silently</li>
            </ul>
          </details>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
      <div className="flex items-center gap-1 text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-xl font-black tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}
