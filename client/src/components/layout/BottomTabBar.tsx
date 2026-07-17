import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, User, Search, Play, Film } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { haptic } from '@/utils/native';
import { useAuthStore } from '@/store/authStore';

/**
 * The app's floating bottom navigation. Extracted from Layout so full-bleed
 * surfaces (e.g. the reels feed) can overlay it without pulling in the whole
 * Layout chrome. `floating` renders it standalone over a dark full-screen view.
 */
export function BottomTabBar({ floating = false }: { floating?: boolean }) {
  const router = useRouter();
  // Live store subscription — the bar is mounted once for the whole session
  // (in _app), so login/logout/avatar changes must flow in, not be a
  // one-shot localStorage read.
  const user = useAuthStore((s) => s.user);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb pointer-events-none">
      <div className="max-w-[630px] mx-auto px-3 pb-2">
        <div className={`glimmer pointer-events-auto relative overflow-hidden rounded-4xl border backdrop-blur-2xl shadow-couture ${floating ? 'border-white/15 bg-gradient-to-b from-white/[0.12] to-black/85' : 'border-white/10 bg-gradient-to-b from-white/[0.07] to-charcoal/80'}`}>
          {/* neon spectrum hairline crown */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-px gradient-celebration opacity-40" aria-hidden />
          <div className="flex items-center justify-around h-16">
            <TabItem href="/" icon={<Home className="w-6 h-6" />} label="Home" active={router.pathname === '/'} tone="pink" />
            <TabItem href="/search" icon={<Search className="w-6 h-6" />} label="Search" active={router.pathname === '/search'} tone="cyan" />
            <TabItem href="/reels" icon={<Film className="w-6 h-6" />} label="Reels" active={router.pathname === '/reels' || router.pathname === '/reels/[id]'} tone="magenta" />
            <TabItem href="/streams" icon={<Play className="w-6 h-6" />} label="Live" active={router.pathname === '/streams'} tone="live" />
            <TabItem
              href={user ? '/profile' : '/auth/login'}
              icon={
                user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden ${router.pathname === '/profile' ? 'ring-1 ring-accent-violet shadow-glow-violet' : ''}`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full bg-accent-violet/20 text-accent-violet flex items-center justify-center">
                        {user.displayName?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                ) : (
                  <User className="w-6 h-6" />
                )
              }
              label="Profile"
              active={router.pathname === '/profile'}
              tone="violet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Contextual neon tones — pink=home/love, cyan=search, magenta=reels/hype, red=live, violet=you */
const TAB_TONES = {
  pink: {
    pill: 'bg-brand-500/[0.12] border border-brand-500/25 shadow-glow',
    icon: 'text-brand-400 drop-shadow-[0_0_8px_rgba(255,79,163,0.5)]',
    label: 'text-brand-400',
  },
  cyan: {
    pill: 'bg-accent-cyan/[0.10] border border-accent-cyan/25 shadow-glow-cyan',
    icon: 'text-accent-cyan drop-shadow-[0_0_8px_rgba(34,224,214,0.5)]',
    label: 'text-accent-cyan',
  },
  magenta: {
    pill: 'bg-accent-magenta/[0.10] border border-accent-magenta/25 shadow-glow-magenta',
    icon: 'text-accent-magenta drop-shadow-[0_0_8px_rgba(240,56,255,0.5)]',
    label: 'text-accent-magenta',
  },
  live: {
    pill: 'bg-live/[0.10] border border-live/25 shadow-glow-live',
    icon: 'text-live drop-shadow-[0_0_8px_rgba(255,48,64,0.5)]',
    label: 'text-live',
  },
  violet: {
    pill: 'bg-accent-violet/[0.12] border border-accent-violet/25 shadow-glow-violet',
    icon: 'text-accent-violet drop-shadow-[0_0_8px_rgba(124,92,255,0.5)]',
    label: 'text-accent-violet',
  },
} as const;

function TabItem({ href, icon, label, active, tone = 'pink' }: { href: string; icon: React.ReactNode; label: string; active: boolean; tone?: keyof typeof TAB_TONES }) {
  const reduceMotion = useReducedMotion();
  const t = TAB_TONES[tone];

  return (
    <Link
      href={href}
      onClick={() => haptic('light')}
      className="relative flex-1 h-full flex items-center justify-center no-select"
    >
      {active && (
        <motion.span
          layoutId="couture-tab-indicator"
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
          className={`absolute inset-x-1.5 inset-y-1.5 rounded-3xl ${t.pill}`}
          aria-hidden
        />
      )}
      <motion.span
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        className={`relative flex flex-col items-center gap-0.5 transition-colors duration-200 ${
          active ? t.icon : 'text-white/40 hover:text-white/70'
        }`}
      >
        {icon}
        <span className={`text-[11px] font-medium tracking-wide ${active ? t.label : ''}`}>{label}</span>
      </motion.span>
    </Link>
  );
}
