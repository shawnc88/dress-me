import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { Home, PlusCircle, User, LogOut, Search, Sparkles, Play } from 'lucide-react';

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
        <nav className="sticky top-0 z-50 glass-nav">
          <div className="max-w-[630px] mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo / Wordmark */}
            <Link href="/" className="transition-opacity hover:opacity-70">
              <h1 className="font-display text-[22px] font-bold text-white tracking-tight animate-glow-breathe" style={{ fontStyle: 'italic' }}>
                Dress Me
              </h1>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {user ? (
                <>
                  {user.role === 'VIEWER' && (
                    <Link
                      href="/become-creator"
                      className="flex items-center gap-1 gradient-premium text-white text-xs font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Go Creator
                    </Link>
                  )}
                  <Link
                    href="/create"
                    className="p-2 rounded-xl hover:bg-glass transition-colors relative"
                    aria-label="Create Post"
                  >
                    <PlusCircle className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl hover:bg-glass transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link href="/auth/login" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="btn-primary !px-4 !py-1.5 !text-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* ─── Main content ─── */}
        <main className="pb-20">{children}</main>

        {/* ─── Legal Links ─── */}
        <div className="pb-20 border-t border-white/5 py-6 px-4">
          <div className="max-w-[630px] mx-auto flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <Link href="/terms" className="hover:text-brand-500 transition-colors">Terms</Link>
            <span className="text-white/10">·</span>
            <Link href="/privacy" className="hover:text-brand-500 transition-colors">Privacy</Link>
            <span className="text-white/10">·</span>
            <Link href="/safety" className="hover:text-brand-500 transition-colors">Content Policy</Link>
            <span className="text-white/10">·</span>
            <Link href="/giveaway-rules" className="hover:text-brand-500 transition-colors">Giveaway Rules</Link>
          </div>
          <p className="text-center text-[10px] text-gray-700 mt-2">&copy; {new Date().getFullYear()} Dress Me</p>
        </div>

        {/* ─── Bottom Tab Bar ─── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-nav safe-area-pb">
          <div className="max-w-[630px] mx-auto flex items-center justify-around h-14">
            <TabItem href="/" icon={<Home className="w-6 h-6" />} label="Home" active={router.pathname === '/'} />
            <TabItem href="/streams" icon={<Search className="w-6 h-6" />} label="Discover" active={router.pathname === '/streams'} />
            <TabItem href="/feed" icon={<Play className="w-6 h-6" />} label="Feed" active={router.pathname === '/feed'} />
            <TabItem href="/create" icon={<PlusCircle className="w-6 h-6" />} label="Create" active={router.pathname === '/create'} />
            <TabItem
              href={user ? '/profile' : '/auth/login'}
              icon={
                user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden ${router.pathname === '/profile' ? 'ring-1 ring-brand-500' : ''}`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
        active
          ? 'text-brand-500'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </Link>
  );
}
