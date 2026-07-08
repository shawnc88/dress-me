import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { User, AtSign, Mail, Lock, ArrowRight, Camera } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setError('');
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Terms of Use and Privacy Policy to continue');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          displayName: form.displayName,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await fetch(`${API_URL}/api/users/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.token}` },
          body: formData,
        });
      }

      router.push('/');
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
        <title>Sign Up - Be With Me</title>
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
                Join the <span className="text-celebration">party</span>.
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-base text-white/55 lg:mx-0">
                Live rooms from every kind of creator — your people are waiting.
              </p>
            </motion.div>

            {/* Form card */}
            <motion.form
              {...entrance(0.12)}
              onSubmit={handleSubmit}
              className="glass-couture space-y-5 rounded-4xl p-7 shadow-couture sm:p-8"
            >
              {error && (
                <div className="rounded-2xl border border-live/30 bg-live/10 px-4 py-3 text-sm text-live">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="displayName" className="mb-2 block text-sm text-white/70">
                  Display Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="displayName"
                    type="text"
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    required
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="How you'll appear on streams"
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-accent-cyan/40 bg-white/5 backdrop-blur-sm transition-colors hover:border-accent-cyan/70 hover:bg-white/10"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-white/50" />
                    )}
                  </button>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 shadow-glow">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/40">Add a profile photo</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <label htmlFor="username" className="mb-2 block text-sm text-white/70">
                  Username
                </label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    required
                    pattern="^[a-zA-Z0-9_]+$"
                    minLength={3}
                    maxLength={30}
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="Letters, numbers, and underscores"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-white/70">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
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
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    minLength={8}
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm text-white/70">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    required
                    className="input-couture min-h-[48px] w-full py-3.5 pl-11 pr-4"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              {/* Terms / EULA agreement — required before registering (App Store Guideline 1.2) */}
              <label htmlFor="agree" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/3 p-3.5 text-left">
                <input
                  id="agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-500"
                />
                <span className="text-xs leading-relaxed text-white/60">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="font-medium text-brand-400 underline">Terms of Use (EULA)</Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="font-medium text-brand-400 underline">Privacy Policy</Link>.
                  I understand there is <span className="text-white/80">zero tolerance for objectionable content or abusive behavior</span>, and that I can report or block users at any time.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !agreed}
                className="btn-couture min-h-[48px] w-full text-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating account...' : <>Create Account <ArrowRight className="ml-2 inline h-4 w-4" /></>}
              </button>

              <p className="text-center text-sm text-white/50">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-brand-400 transition-colors hover:text-brand-300"
                >
                  Log in
                </Link>
              </p>
            </motion.form>
          </div>
        </div>
      </div>
    </>
  );
}
