import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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
      // authStore owns identity: writes the store + localStorage snapshot,
      // and apiFetch gives login a hard timeout on a cold backend.
      await useAuthStore.getState().login(email, password);
      const user = useAuthStore.getState().user;

      if (user?.role === 'CREATOR' || user?.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
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

      <div className="grain relative min-h-[100dvh] overflow-hidden celebration-canvas text-white">
        <div className="safe-area-all relative flex min-h-[100dvh] items-center justify-center px-5 py-12">
          <div className="w-full max-w-md lg:grid lg:max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            {/* Hero */}
            <motion.div {...entrance(0)} className="mb-10 text-center lg:mb-0 lg:text-left">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.35em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-glow-cyan" />
                Be With Me
              </span>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight leading-[1.05] sm:text-6xl lg:text-7xl">
                Welcome <span className="text-celebration">back</span>.
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-base text-white/55 lg:mx-0">
                Your people are waiting. Jump back in.
              </p>
            </motion.div>

            {/* Form card */}
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

              <p className="text-center text-xs leading-relaxed text-white/40">
                By continuing you agree to our{' '}
                <Link href="/terms" target="_blank" className="text-brand-400 underline">Terms of Use (EULA)</Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-brand-400 underline">Privacy Policy</Link>.
              </p>

              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex min-h-[44px] items-center text-sm text-white/50 transition-colors hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>

              <p className="text-center text-sm text-white/50">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-brand-400 transition-colors hover:text-brand-300"
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
