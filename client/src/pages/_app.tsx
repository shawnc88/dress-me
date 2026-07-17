import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Inter, Playfair_Display } from 'next/font/google';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { initNativePlugins } from '@/utils/native';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAuthStore } from '@/store/authStore';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

// The bottom tab bar lives HERE — once, above the page swap — so switching
// tabs never unmounts it (no flicker/jump, and the active pill animates
// between tabs). Route templates that are immersive/flow surfaces hide it.
const TAB_BAR_HIDDEN = new Set([
  '/auth/login',
  '/auth/signup',
  '/stream/[id]',
  '/suite/[streamId]',
  '/admin',
  '/admin/reports',
  '/admin/users',
  '/become-creator',
  '/feed',
  '/invite/[code]',
  '/messages/[id]',
  '/payment/success',
  '/payment/cancel',
  '/dashboard/3d-test',
  '/404',
  '/500',
]);
// Full-bleed dark surfaces get the higher-contrast floating variant.
const TAB_BAR_FLOATING = new Set(['/', '/reels', '/reels/[id]']);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Hydrate identity once for the whole app: seeds from the localStorage
  // snapshot for instant paint, then refreshes from /api/auth/me.
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  // Initialize Capacitor native plugins on mount
  useEffect(() => {
    initNativePlugins();
    // Failsafe: never let the native splash stay up forever, even if
    // initNativePlugins hangs. No-ops on web.
    const t = setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Head>
        {/* Viewport: disable zoom, enable safe areas, mobile-optimized */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </Head>
      <div className={`${inter.variable} ${playfair.variable} font-sans`}>
        <ErrorBoundary>
          <Component {...pageProps} />
          {!TAB_BAR_HIDDEN.has(router.pathname) && (
            <BottomTabBar floating={TAB_BAR_FLOATING.has(router.pathname)} />
          )}
        </ErrorBoundary>
      </div>
    </>
  );
}
