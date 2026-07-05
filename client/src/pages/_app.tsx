import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initNativePlugins } from '@/utils/native';
import { SplashScreen } from '@capacitor/splash-screen';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function App({ Component, pageProps }: AppProps) {
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
        </ErrorBoundary>
      </div>
    </>
  );
}
