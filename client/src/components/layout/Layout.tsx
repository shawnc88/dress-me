import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { Shirt, Sun, Moon, Home, Radio, PlusCircle, Gift, User, LogOut } from 'lucide-react';

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
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Shirt className="w-5 h-5 text-brand-600" />
              <span className="font-display text-lg font-bold text-brand-600">Dress Me</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <NavLink href="/streams" active={router.pathname === '/streams'} icon={<Radio className="w-4 h-4" />}>Live</NavLink>
              <NavLink href="/giveaways" active={router.pathname === '/giveaways'} icon={<Gift className="w-4 h-4" />}>Giveaways</NavLink>
              {user && <NavLink href="/dashboard" active={router.pathname.startsWith('/dashboard')}>Dashboard</NavLink>}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/go-live"
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all duration-200 hover:shadow-md"
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Go Live
                  </Link>
                  <Link href="/profile" className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-600 transition-transform duration-200 hover:scale-110">
                    {user.displayName?.charAt(0) || '?'}
                  </Link>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="text-sm font-medium hover:text-brand-600 transition-colors duration-200">
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="btn-primary text-xs !px-3 !py-1.5 transition-all duration-200 hover:shadow-md">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-2 py-1 safe-area-pb">
          <div className="flex items-center justify-around">
            <TabItem href="/" icon={<Home className="w-5 h-5" />} label="Home" active={router.pathname === '/'} />
            <TabItem href="/streams" icon={<Radio className="w-5 h-5" />} label="Live" active={router.pathname === '/streams'} />
            <TabItem href="/dashboard/go-live" icon={<PlusCircle className="w-5 h-5" />} label="Create" active={router.pathname === '/dashboard/go-live'} isCreate />
            <TabItem href="/giveaways" icon={<Gift className="w-5 h-5" />} label="Giveaways" active={router.pathname === '/giveaways'} />
            <TabItem href={user ? '/profile' : '/auth/login'} icon={<User className="w-5 h-5" />} label="Profile" active={router.pathname === '/profile'} />
          </div>
        </div>

        {/* Main content — add bottom padding on mobile for tab bar */}
        <main className="pb-16 md:pb-0">{children}</main>

        {/* Footer — hide on mobile */}
        <footer className="hidden md:block border-t border-gray-200 dark:border-gray-800 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-brand-600" />
              <span className="font-display text-sm font-bold text-brand-600">Dress Me</span>
              <span className="text-xs text-gray-400">&copy; {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-xs text-gray-400">
              <Link href="/terms" className="hover:text-brand-600 transition-colors duration-200">Terms</Link>
              <Link href="/privacy" className="hover:text-brand-600 transition-colors duration-200">Privacy</Link>
              <Link href="/giveaway-rules" className="hover:text-brand-600 transition-colors duration-200">Giveaway Rules</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon?: React.ReactNode; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${active ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
    >
      {icon}
      {children}
    </Link>
  );
}

function TabItem({ href, icon, label, active, isCreate }: { href: string; icon: React.ReactNode; label: string; active: boolean; isCreate?: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 py-1 min-w-[48px] transition-transform duration-200 active:scale-95">
      {isCreate ? (
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white -mt-3 shadow-lg transition-shadow duration-200 hover:shadow-xl">
          {icon}
        </div>
      ) : (
        <span className={`transition-colors duration-200 ${active ? 'text-brand-600' : 'text-gray-400'}`}>{icon}</span>
      )}
      <span className={`text-[9px] font-medium ${active ? 'text-brand-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
}
