import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy: the ink `.nightfall-canvas` paints instantly on SSR; three.js (aurora) streams in after.
const AuroraBackdrop = dynamic(() => import('@/components/ui/AuroraBackdrop'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reduceMotion = useReducedMotion();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'CREATOR' || data.user.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const entrance = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: 'easeOut' as const },
        };

  return (
    <>
      <Head>
        <title>Log In - Be With Me</title>
      </Head>

      <div className="grain relative min-h-[100dvh] overflow-hidden bg-ink-950 text-white">
        <AuroraBackdrop variant="auto" intensity="full" />

        <div className="safe-area-all relative flex min-h-[100dvh] items-center justify-center px-5 py-12">
          <div className="w-full max-w-md lg:grid lg:max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            {/* Editorial hero */}
            <motion.div {...entrance(0)} className="mb-10 text-center lg:mb-0 lg:text-left">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.35em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-gold shadow-gold-sm" />
                Be With Me
              </span>
              <h1 className="editorial mt-5 text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
                Welcome <span className="text-couture-gold">back</span>.
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-base text-white/55 lg:mx-0">
                The lights are up, the room is waiting. Step back into the show.
              </p>
            </motion.div>

            {/* Couture form card */}
            <motion.form
              {...entrance(0.12)}
              onSubmit={handleSubmit}
              className="glass-couture space-y-6 rounded-4xl p-7 shadow-couture sm:p-8"
            >
              {error && (
                <div className="rounded-2xl border border-live/30 bg-live/10 px-4 py-3 text-sm text-live">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-white/70">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm text-white/70">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-couture min-h-[48px] w-full text-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Logging in...' : <>Log In <ArrowRight className="ml-2 inline h-4 w-4" /></>}
              </button>

              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex min-h-[44px] items-center text-sm text-white/50 transition-colors hover:text-rose-gold"
                >
                  Forgot password?
                </Link>
              </div>

              <p className="text-center text-sm text-white/50">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-rose-gold transition-colors hover:text-gold-200"
                >
                  Sign up
                </Link>
              </p>
            </motion.form>
          </div>
        </div>
      </div>
    </>
  );
}
