import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Home } from 'lucide-react';

export default function PaymentCancel() {
  const router = useRouter();

  return (
    <>
      <Head><title>Payment Cancelled - Be With Me</title></Head>

      {/* Dark nightfall base — calm, not alarming */}
      <div className="fixed inset-0 nightfall-canvas flex items-center justify-center safe-area-all">
        {/* Subtle top seam */}
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/20 via-accent-violet/20 to-accent-cyan/20"
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm mx-auto px-6 text-center"
        >
          {/* Reassuring icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260 }}
            className="w-20 h-20 mx-auto mb-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"
          >
            <ShieldCheck className="w-9 h-9 text-white/50" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="font-extrabold tracking-tight text-3xl text-white mb-3"
          >
            No worries
          </motion.h1>

          {/* Body copy */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-white/50 text-[15px] leading-relaxed mb-8 max-w-xs mx-auto"
          >
            Nothing was charged. You can try again whenever you&apos;re ready — no rush.
          </motion.p>

          {/* Glass card with CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-card px-5 py-5 flex flex-col gap-3"
          >
            {/* Try again — primary */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.back()}
              className="btn-couture w-full min-h-[52px] text-sm flex items-center justify-center gap-2 no-select"
            >
              Try again
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {/* Go home — secondary glass */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/')}
              className="w-full min-h-[52px] rounded-full bg-white/[0.06] border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 no-select"
            >
              <Home className="w-4 h-4" />
              Back to home
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
