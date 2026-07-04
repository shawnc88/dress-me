import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Gift, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const [streamId, setStreamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!code) return;

    // Track the referral click
    fetch(`${API_URL}/api/viral/referral/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.streamId) setStreamId(data.streamId);

        // If logged in, try to claim the referral
        const token = localStorage.getItem('token');
        if (token) {
          return fetch(`${API_URL}/api/viral/referral/${code}/claim`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.ok ? r.json() : null);
        }
        return null;
      })
      .then(claimData => {
        if (claimData?.rewarded) setClaimed(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="fixed inset-0 celebration-canvas flex items-center justify-center">
        {/* Breathing multicolor orb */}
        <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
          <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
          <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>You&apos;re Invited - Be With Me</title>
      </Head>

      {/* Celebration canvas hero background */}
      <div className="fixed inset-0 celebration-canvas flex flex-col items-center justify-center text-center px-6 safe-area-all overflow-y-auto">
        {/* Decorative top seam */}
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/50 via-accent-violet/50 to-accent-cyan/50"
          aria-hidden
        />

        {/* Warm radial glow behind hero — decorative */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="w-[560px] h-[400px] rounded-full bg-brand-500/[0.07] blur-3xl" />
          <div className="absolute w-[360px] h-[360px] rounded-full bg-accent-violet/[0.06] blur-2xl translate-x-16 -translate-y-8" />
        </div>

        <div className="relative z-10 w-full max-w-xs mx-auto flex flex-col items-center">
          {/* Hero orb — CSS celebration, no WebGL */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="relative w-24 h-24 mb-8"
            aria-hidden
          >
            <div className="pointer-events-none absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-0 rounded-full neon-hairline flex items-center justify-center animate-float">
              <Sparkles className="w-10 h-10 text-accent-cyan" />
            </div>
          </motion.div>

          {/* Eyebrow label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[10px] font-semibold uppercase tracking-[0.34em] text-accent-cyan/80 mb-4"
          >
            Join the party
          </motion.p>

          {/* Headline — gradient-celebration + text-celebration */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-extrabold tracking-tight text-5xl leading-[1.02] mb-4"
          >
            You&apos;re{' '}
            <span className="text-celebration">invited!</span>
          </motion.h1>

          {/* Sub-copy — universal, no fashion language */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/55 text-[15px] leading-relaxed mb-6 max-w-[280px]"
          >
            A friend brought you here — live creators, real energy, your kind of vibe.
          </motion.p>

          {/* Claimed bonus — glass card with green glow */}
          {claimed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full glass-card px-4 py-3.5 flex items-center gap-3 mb-6 border-accent-green/25 shadow-glow-green text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent-green/10 border border-accent-green/25 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-accent-green" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">25 free coins added!</p>
                <p className="text-xs text-white/45">Welcome gift — on us.</p>
              </div>
            </motion.div>
          )}

          {/* Inviter glass card (avatar ring glow) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full glass-card px-5 py-4 flex items-center gap-4 mb-7 text-left"
          >
            {/* Decorative neon top hairline */}
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-brand-500/40 via-accent-violet/30 to-transparent rounded-full"
              aria-hidden
            />
            {/* Avatar ring glow */}
            <div className="relative flex-shrink-0">
              <div className="pointer-events-none absolute inset-0 rounded-full blur-md gradient-celebration opacity-40" aria-hidden />
              <div className="ring-creator w-12 h-12">
                <div className="w-full h-full rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-cyan/70 mb-0.5">
                Your host
              </p>
              <p className="text-sm font-bold text-white">Be With Me Creator</p>
              <p className="text-xs text-white/40">Live, right now</p>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-3 w-full"
          >
            {streamId ? (
              <Link
                href={`/stream/${streamId}`}
                className="btn-couture w-full min-h-[52px] text-base flex items-center justify-center gap-2 no-select shadow-glow"
              >
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                Join the Live Stream
              </Link>
            ) : (
              <Link
                href="/auth/signup"
                className="btn-couture w-full min-h-[52px] text-base flex items-center justify-center gap-2 no-select shadow-glow"
              >
                Join Be With Me Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}

            <Link
              href="/"
              className="w-full min-h-[44px] text-white/40 hover:text-white/70 text-sm font-medium flex items-center justify-center transition-colors"
            >
              Browse first
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  );
}
