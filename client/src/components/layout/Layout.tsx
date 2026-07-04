import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { Home, PlusCircle, User, LogOut, Search, Sparkles, Play, Shield, Film } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StreakBanner } from '@/components/ui/StreakBanner';
import { haptic } from '@/utils/native';

export function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  }

  return (
    <div className="dark">
      <div className="min-h-screen bg-surface-dark">
        {/* ─── Top Nav ─── */}
        <nav className="sticky top-0 z-50 glass-nav relative">
          {/* faint glass wash */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" aria-hidden />
          {/* neon spectrum hairline seam */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px gradient-celebration opacity-30" aria-hidden />

          <div className="relative max-w-[630px] mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo / Wordmark — bold sans + vibrant multicolor dot */}
            <Link href="/" className="group flex items-baseline gap-1.5 transition-opacity hover:opacity-80 no-select">
              <h1 className="font-sans text-[19px] font-extrabold tracking-tight text-white">
                Be With Me
              </h1>
              <span
                className="w-[6px] h-[6px] rounded-full gradient-celebration shadow-glow-cyan translate-y-[-1px] group-hover:shadow-glow transition-shadow"
                aria-hidden
              />
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-0.5">
              {user ? (
                <>
                  {user.role === 'VIEWER' && (
                    <Link
                      href="/become-creator"
                      className="group relative overflow-hidden flex items-center gap-1.5 mr-1 px-3.5 py-2 rounded-full text-xs font-semibold text-accent-amber bg-accent-amber/[0.08] border border-accent-amber/40 shadow-glow-amber transition-all duration-300 hover:border-accent-amber/70 hover:bg-accent-amber/[0.14] hover:text-accent-yellow active:scale-[0.97]"
                    >
                      {/* sheen sweep */}
                      <span
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                        aria-hidden
                      />
                      <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
                      Go Creator
                    </Link>
                  )}
                  {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                    <Link
                      href="/admin"
                      className="w-11 h-11 flex items-center justify-center rounded-full text-accent-blue/80 hover:text-accent-blue hover:bg-white/[0.06] active:scale-95 transition-all"
                      aria-label="Admin"
                    >
                      <Shield className="w-5 h-5" />
                    </Link>
                  )}
                  <NotificationBell />
                  <Link
                    href="/create"
                    className="w-11 h-11 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all relative"
                    aria-label="Create Post"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={logout}
                    className="w-11 h-11 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 ml-1">
                  <Link href="/auth/login" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="btn-couture !px-4 !py-2 !text-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* ─── Streak Banner (auto-shows on daily check-in) ─── */}
        <StreakBanner />

        {/* ─── Main content ─── */}
        <main className="pb-24">{children}</main>

        {/* ─── Legal Links ─── */}
        <div className="pb-28 border-t border-white/5 py-6 px-4">
          <div className="max-w-[630px] mx-auto flex flex-wrap items-center justify-center gap-4 text-xs text-white/30">
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
            <span className="text-white/20">·</span>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <span className="text-white/20">·</span>
            <Link href="/safety" className="hover:text-white/70 transition-colors">Content Policy</Link>
            <span className="text-white/20">·</span>
            <Link href="/giveaway-rules" className="hover:text-white/70 transition-colors">Giveaway Rules</Link>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-2">&copy; {new Date().getFullYear()} Be With Me</p>
        </div>

        {/* ─── Bottom Tab Bar — floating glass, neon accents ─── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb pointer-events-none">
          <div className="max-w-[630px] mx-auto px-3 pb-2">
            <div className="pointer-events-auto relative overflow-hidden rounded-4xl border border-white/10 backdrop-blur-2xl shadow-couture bg-gradient-to-b from-white/[0.07] to-charcoal/80">
              {/* neon spectrum hairline crown */}
              <div className="pointer-events-none absolute top-0 inset-x-0 h-px gradient-celebration opacity-40" aria-hidden />
              <div className="flex items-center justify-around h-16">
                <TabItem href="/" icon={<Home className="w-6 h-6" />} label="Home" active={router.pathname === '/'} tone="pink" />
                <TabItem href="/search" icon={<Search className="w-6 h-6" />} label="Search" active={router.pathname === '/search'} tone="cyan" />
                <TabItem href="/reels" icon={<Film className="w-6 h-6" />} label="Reels" active={router.pathname === '/reels'} tone="magenta" />
                <TabItem href="/streams" icon={<Play className="w-6 h-6" />} label="Live" active={router.pathname === '/streams'} tone="live" />
                <TabItem
                  href={user ? '/profile' : '/auth/login'}
                  icon={
                    user ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden ${router.pathname === '/profile' ? 'ring-1 ring-accent-violet shadow-glow-violet' : ''}`}>
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
        <span className={`text-[9px] font-medium tracking-wide ${active ? t.label : ''}`}>{label}</span>
      </motion.span>
    </Link>
  );
}
