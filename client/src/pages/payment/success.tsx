import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Check, Coins, ArrowRight } from 'lucide-react';

export default function PaymentSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to home after 3 seconds
    const timer = setTimeout(() => router.push('/'), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Head><title>Payment Successful - Be With Me</title></Head>

      {/* Celebration canvas background */}
      <div className="fixed inset-0 celebration-canvas flex items-center justify-center safe-area-all">
        {/* Decorative neon hairline top seam */}
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-accent-green/50 via-accent-cyan/50 to-brand-500/50"
          aria-hidden
        />

        {/* Subtle confetti radial burst behind card */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="w-[480px] h-[480px] rounded-full bg-accent-green/[0.06] blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm mx-auto px-6 text-center animate-rise"
        >
          {/* Check badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="relative w-24 h-24 mx-auto mb-8"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-full bg-accent-green/20 blur-2xl animate-glow-breathe"
              aria-hidden
            />
            <div className="absolute inset-0 rounded-full bg-accent-green/10 border border-accent-green/40 shadow-glow-green flex items-center justify-center">
              <Check className="w-11 h-11 text-accent-green" strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent-green/80 mb-3"
          >
            Payment complete
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="font-extrabold tracking-tight text-5xl leading-[1.02] text-white mb-4"
          >
            You&apos;re <span className="text-celebration">in!</span>
          </motion.h1>

          {/* Glass summary card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="glisten overflow-hidden glass-card px-5 py-4 mb-8 text-left"
          >
            {/* Neon top hairline */}
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-green/40 via-accent-cyan/30 to-transparent rounded-full"
              aria-hidden
            />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center flex-shrink-0">
                <Coins className="w-5 h-5 text-accent-amber" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Threads credited</p>
                <p className="text-xs text-white/45 mt-0.5">Your balance has been updated</p>
              </div>
            </div>
          </motion.div>

          {/* CTA back to app */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/')}
            className="glimmer overflow-hidden btn-couture w-full min-h-[52px] text-base flex items-center justify-center gap-2 no-select"
          >
            Back to the party
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-white/25 text-xs mt-5"
          >
            Redirecting you back automatically…
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
