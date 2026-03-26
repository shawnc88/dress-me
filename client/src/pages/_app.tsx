import type { AppProps } from 'next/app';
import { Inter, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${playfair.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
}
