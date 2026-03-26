import Link from 'next/link';
import { ReactNode, useState } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-surface-dark">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">👗</span>
              <span className="font-display text-xl font-bold text-brand-600">Dress Me</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/streams" className="text-sm font-medium hover:text-brand-600 transition-colors">
                Live Now
              </Link>
              <Link href="/creators" className="text-sm font-medium hover:text-brand-600 transition-colors">
                Creators
              </Link>
              <Link href="/giveaways" className="text-sm font-medium hover:text-brand-600 transition-colors">
                Giveaways
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <Link href="/auth/login" className="text-sm font-medium hover:text-brand-600">
                Log In
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm !px-4 !py-2">
                Sign Up
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">👗</span>
                <span className="font-display text-lg font-bold text-brand-600">Dress Me</span>
              </div>
              <p className="text-sm text-gray-500">Fashion comes alive. Watch, interact, and shop in real-time.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/streams" className="hover:text-brand-600">Live Streams</Link></li>
                <li><Link href="/creators" className="hover:text-brand-600">Creators</Link></li>
                <li><Link href="/giveaways" className="hover:text-brand-600">Giveaways</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/about" className="hover:text-brand-600">About</Link></li>
                <li><Link href="/creators/apply" className="hover:text-brand-600">Become a Creator</Link></li>
                <li><Link href="/support" className="hover:text-brand-600">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/terms" className="hover:text-brand-600">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link></li>
                <li><Link href="/giveaway-rules" className="hover:text-brand-600">Giveaway Rules</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Dress Me. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
