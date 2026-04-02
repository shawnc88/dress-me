import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { Sun, Moon, Home, PlusCircle, User, LogOut, Heart, Search, Sparkles } from 'lucide-react';

export function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
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
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-surface-dark">
        {/* ─── Top Nav (Instagram-style) ─── */}
        <nav className="sticky top-0 z-50 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-[630px] mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo / Wordmark */}
            <Link href="/" className="transition-opacity hover:opacity-70">
              <h1 className="font-display text-[22px] font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontStyle: 'italic' }}>
                Dress Me
              </h1>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
              </button>

              {user ? (
                <>
                  {user.role === 'VIEWER' && (
                    <Link
                      href="/become-creator"
                      className="flex items-center gap-1 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Go Creator
                    </Link>
                  )}
                  <Link
                    href="/create"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                    aria-label="Create Post"
                  >
                    <PlusCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </Link>
                  <Link
                    href="/giveaways"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                    aria-label="Giveaways"
                  >
                    <Heart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link href="/auth/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* ─── Main content ─── */}
        <main className="pb-16">{children}</main>

        {/* ─── Legal Links (above tab bar) ─── */}
        <div className="pb-16 border-t border-gray-200 dark:border-gray-800 py-6 px-4">
          <div className="max-w-[630px] mx-auto flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-brand-600 transition-colors">Terms</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/privacy" className="hover:text-brand-600 transition-colors">Privacy</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/safety" className="hover:text-brand-600 transition-colors">Content Policy</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/giveaway-rules" className="hover:text-brand-600 transition-colors">Giveaway Rules</Link>
          </div>
          <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 mt-2">&copy; {new Date().getFullYear()} Dress Me</p>
        </div>

        {/* ─── Mobile Bottom Tab Bar (Instagram-style) ─── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-pb">
          <div className="flex items-center justify-around h-12">
            <TabItem href="/" icon={<Home className="w-6 h-6" />} active={router.pathname === '/'} />
            <TabItem href="/streams" icon={<Search className="w-6 h-6" />} active={router.pathname === '/streams'} />
            <TabItem href="/create" icon={<PlusCircle className="w-6 h-6" />} active={router.pathname === '/create'} />
            <TabItem href="/giveaways" icon={<Heart className="w-6 h-6" />} active={router.pathname === '/giveaways'} />
            <TabItem
              href={user ? '/profile' : '/auth/login'}
              icon={
                user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden ${router.pathname === '/profile' ? 'ring-1 ring-gray-900 dark:ring-white' : ''}`}>
                    <span className="w-full h-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center">
                      {user.displayName?.charAt(0) || '?'}
                    </span>
                  </div>
                ) : (
                  <User className="w-6 h-6" />
                )
              }
              active={router.pathname === '/profile'}
            />
          </div>
        </div>

        {/* ─── Desktop Bottom Nav ─── */}
        <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-[630px] mx-auto flex items-center justify-around h-12">
            <TabItem href="/" icon={<Home className="w-6 h-6" />} active={router.pathname === '/'} />
            <TabItem href="/streams" icon={<Search className="w-6 h-6" />} active={router.pathname === '/streams'} />
            <TabItem href="/create" icon={<PlusCircle className="w-6 h-6" />} active={router.pathname === '/create'} />
            <TabItem href="/giveaways" icon={<Heart className="w-6 h-6" />} active={router.pathname === '/giveaways'} />
            <TabItem
              href={user ? '/profile' : '/auth/login'}
              icon={
                user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden ${router.pathname === '/profile' ? 'ring-1 ring-gray-900 dark:ring-white' : ''}`}>
                    <span className="w-full h-full bg-brand-100 dark:bg-brand-900 text-brand-600 flex items-center justify-center">
                      {user.displayName?.charAt(0) || '?'}
                    </span>
                  </div>
                ) : (
                  <User className="w-6 h-6" />
                )
              }
              active={router.pathname === '/profile'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabItem({ href, icon, active }: { href: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`p-2 transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
    >
      {icon}
    </Link>
  );
}
