import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { PlusCircle, LogOut, Sparkles, Shield } from 'lucide-react';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StreakBanner } from '@/components/ui/StreakBanner';
import { useAuthStore } from '@/store/authStore';

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
    // Full reset: clears token + snapshot, disconnects the shared socket.
    useAuthStore.getState().logout();
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
          <p className="text-center text-[11px] text-white/20 mt-2">&copy; {new Date().getFullYear()} Be With Me</p>
        </div>

        {/* Bottom tab bar renders once in _app so it persists across tabs. */}
      </div>
    </div>
  );
}
