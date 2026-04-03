import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Gift } from 'lucide-react';

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
      <div className="fixed inset-0 bg-surface-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>You&apos;re Invited - Dress Me</title>
      </Head>

      <div className="fixed inset-0 bg-surface-dark flex flex-col items-center justify-center text-center px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,79,163,0.1),transparent_70%)] pointer-events-none" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full gradient-premium flex items-center justify-center mb-6 relative z-10"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white text-3xl font-bold mb-2"
        >
          You&apos;re Invited!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 text-sm mb-4 max-w-sm"
        >
          A friend invited you to Dress Me — live fashion streaming, interactive shows, and exclusive content
        </motion.p>

        {claimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-2xl text-sm font-medium mb-6"
          >
            <Gift className="w-4 h-4" />
            25 free coins added to your account!
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          {streamId ? (
            <Link
              href={`/stream/${streamId}`}
              className="btn-glow w-full text-center"
            >
              Join the Live Stream
            </Link>
          ) : (
            <Link href="/auth/signup" className="btn-glow w-full text-center">
              Join Dress Me Free
            </Link>
          )}

          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            Browse first
          </Link>
        </motion.div>
      </div>
    </>
  );
}
