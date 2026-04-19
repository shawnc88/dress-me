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
 * Lets admins fire each gift animation on demand without going through the
 * coin-purchase / Stripe / IAP flow. Also surfaces:
 *  - Live FPS counter
 *  - Active animation count
 *  - prefers-reduced-motion status
 *  - A stress-test button (fires many in sequence)
 *
 * Gated to ADMIN / MODERATOR — anyone else is redirected home.
 */
export default function ThreeDTestPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { animations, trigger, clear } = useGiftAnimation();
  const [fps, setFps] = useState(0);
  const [stressCount, setStressCount] = useState(0);
  const [authState, setAuthState] = useState<AuthState>('hydrating');

  // Hydrate the auth store from localStorage (the app doesn't auto-hydrate it)
  // and then gate to ADMIN / MODERATOR.
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

    // No user yet — kick off hydrate. If there's no token, bounce to login.
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
    // Second wave 2.5s later
    setTimeout(() => {
      types.forEach((type, i) => {
        setTimeout(() => trigger(type), i * 250);
      });
    }, 2500);
  }

  // Loading / unauthorized states
  if (authState === 'hydrating') {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white/60">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (authState === 'unauthorized') {
    return null;
  }

  return (
    <>
      <Head>
        <title>3D Animation Test · Be With Me</title>
      </Head>
      <div className="min-h-screen bg-[#0b0b0f] text-white relative overflow-hidden">
        {/* Subtle "stage" background so animations are visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-[#0b0b0f] to-brand-900/20" />

        {/* 3D scene overlay — always present, only paints while animations active */}
        <Suspense fallback={null}>
          <GiftScene animations={animations} />
        </Suspense>

        {/* UI — above Canvas via z-index */}
        <div className="relative z-[60] max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-2">Dev Tools</p>
              <h1 className="text-3xl font-black tracking-tight">3D Animation Test Lab</h1>
              <p className="text-white/50 text-sm mt-2 max-w-md">
                Fire gift animations without going through the purchase flow. Use this
                to verify rendering, timing, and perf on every device you support.
              </p>
            </div>
            <button
              onClick={clear}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
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

          {/* Gift buttons */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-white/80 tracking-wider uppercase mb-3">
              Single Gift
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GIFTS.map((g) => {
                const Icon = g.icon;
                return (
                  <motion.button
                    key={g.type}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => fireGift(g.type)}
                    className="group flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 transition-all text-left"
                  >
                    <div className="text-3xl">{g.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-bold">{g.label}</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-wider">
                        {g.animation} · {g.threads}🧵
                      </div>
                    </div>
                    <Icon className="w-4 h-4 text-white/30 group-hover:text-violet-400 transition-colors" />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Stress test */}
          <div className="mb-10">
            <h2 className="text-sm font-bold text-white/80 tracking-wider uppercase mb-3">
              Stress Test
            </h2>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={stressTest}
              className="w-full p-5 rounded-2xl bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-red-500/30 text-white font-bold flex items-center justify-center gap-3"
            >
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Fire 12 gifts in 5 seconds</span>
              {stressCount > 0 && (
                <span className="text-xs text-white/50">(ran {stressCount}×)</span>
              )}
            </motion.button>
            <p className="text-white/40 text-xs mt-2">
              Watch FPS during this. On iPhone 12+ / M1 Mac: should stay above 55.
              iPhone 8 / SE: should stay above 30. Below 30 = perf regression.
            </p>
          </div>

          {/* Notes */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h3 className="text-sm font-bold mb-2">What to check</h3>
            <ul className="text-white/60 text-xs space-y-1.5 list-disc list-inside">
              <li>Each animation should look correct at the right position, size, and tier colors</li>
              <li>FPS should stay in the green zone (55+) even when 3 concurrent animations play</li>
              <li>When you click Clear, no stray particles or lights should remain</li>
              <li>Enable reduced-motion in OS settings — all 3D should be skipped silently</li>
              <li>After 50 fires, memory should be stable (Dev Tools → Performance → Memory)</li>
            </ul>
          </div>
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
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-2xl font-black tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}
