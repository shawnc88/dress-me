import Head from 'next/head';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Shirt, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Something went wrong');
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <Head>
        <title>Forgot Password - Be With Me</title>
      </Head>

      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Shirt className="w-10 h-10 text-brand-600 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Forgot Password</h1>
            <p className="text-gray-500">
              {sent
                ? "We've sent you a reset link if your email is registered."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>
          </div>

          {sent ? (
            <div className="card p-8 text-center space-y-5">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm text-gray-500">
                Check your inbox at <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-gray-400">
                Didn&apos;t get it? Check spam, or try again in a few minutes.
              </p>
              <Link href="/auth/login" className="text-brand-600 font-medium hover:underline text-sm">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : <>Send Reset Link <ArrowRight className="w-4 h-4 ml-2 inline" /></>}
              </button>

              <p className="text-center text-sm text-gray-500">
                Remembered it?{' '}
                <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
