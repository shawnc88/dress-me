import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Check, Coins } from 'lucide-react';

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
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-white text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-white/60 text-sm mb-1">Your threads have been added to your balance</p>
          <div className="flex items-center justify-center gap-1 text-amber-400 text-sm font-medium mt-4">
            <Coins className="w-4 h-4" /> Threads credited
          </div>
          <p className="text-white/30 text-xs mt-6">Redirecting you back...</p>
        </motion.div>
      </div>
    </>
  );
}
