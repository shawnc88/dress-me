import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, TrendingUp, Gift, Users, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EarningsSummary {
  totalEarningsUsd: number;
  totalGifts: number;
  totalStreams: number;
  pendingPayoutUsd: number;
  streams: Array<{
    streamId: string;
    title: string;
    giftsCount: number;
    grossCents: number;
    netCents: number;
    date: string;
  }>;
}

export default function EarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    fetch(`${API_URL}/api/engagement/earnings-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div></Layout>;
  }

  return (
    <Layout>
      <Head><title>Earnings - Dress Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          Earnings
        </h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={DollarSign} label="Total Earnings" value={`$${(data?.totalEarningsUsd || 0).toFixed(2)}`} color="text-emerald-400" />
          <StatCard icon={Gift} label="Total Gifts" value={String(data?.totalGifts || 0)} color="text-amber-400" />
          <StatCard icon={TrendingUp} label="Streams" value={String(data?.totalStreams || 0)} color="text-brand-400" />
          <StatCard icon={DollarSign} label="Pending Payout" value={`$${(data?.pendingPayoutUsd || 0).toFixed(2)}`} color="text-white" />
        </div>

        {/* Withdraw button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {/* TODO: Stripe Connect payout */ alert('Payouts coming soon! We are setting up Stripe Connect.'); }}
          className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold mb-8 flex items-center justify-center gap-2"
        >
          Withdraw Funds <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Per-stream breakdown */}
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3">Stream Revenue</h3>
        <div className="space-y-2">
          {(data?.streams || []).length === 0 && (
            <p className="text-white/30 text-sm py-4 text-center">No streams with revenue yet</p>
          )}
          {(data?.streams || []).map(s => (
            <div key={s.streamId} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{s.title}</p>
                <p className="text-white/40 text-[10px]">{s.date} &middot; {s.giftsCount} gifts</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-bold text-sm">${(s.netCents / 100).toFixed(2)}</p>
                <p className="text-white/30 text-[10px]">net</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payout info */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
          <p className="text-white/60 text-xs font-medium mb-1">Payout Info</p>
          <p className="text-white/30 text-[10px]">210 threads = $1.00 USD &middot; Platform fee: 20% &middot; Minimum payout: $10</p>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-bold text-xl">{value}</p>
    </div>
  );
}
