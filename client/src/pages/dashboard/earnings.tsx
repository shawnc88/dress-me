import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, TrendingUp, Gift, Users, ArrowRight, Loader2, ChevronDown, X } from 'lucide-react';
import { EarningsBreakdown } from '@/components/creator/EarningsBreakdown';

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
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/api/engagement/earnings-summary`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Get creator ID for earnings breakdown
    fetch(`${API_URL}/api/creators/me`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.creator?.id) setCreatorId(d.creator.id); })
      .catch(() => {});
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {/* Breathing multicolor orb — no bare spinner */}
          <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Earnings - Be With Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        {/* ─── Celebration header — slim, CSS color only ─── */}
        <div className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-5 pt-6 pb-5">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-green/50 via-accent-cyan/50 to-accent-amber/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center gap-3.5 animate-rise">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/25 shadow-glow-green flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-accent-green" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-1">
                Money moves
              </p>
              <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                Your <span className="text-celebration">earnings</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={DollarSign} label="Total Earnings" value={`$${(data?.totalEarningsUsd || 0).toFixed(2)}`} color="text-accent-green" chip="bg-accent-green/10" border="border-accent-green/25 hover:border-accent-green/45 hover:shadow-glow-green" hairline="via-accent-green/50" delay={0} />
          <StatCard icon={Gift} label="Total Gifts" value={String(data?.totalGifts || 0)} color="text-accent-amber" chip="bg-accent-amber/10" border="border-white/[0.08] hover:border-accent-amber/40" hairline="via-accent-amber/40" delay={70} />
          <StatCard icon={TrendingUp} label="Streams" value={String(data?.totalStreams || 0)} color="text-accent-cyan" chip="bg-accent-cyan/10" border="border-white/[0.08] hover:border-accent-cyan/40" hairline="via-accent-cyan/40" delay={140} />
          <StatCard icon={DollarSign} label="Pending Payout" value={`$${(data?.pendingPayoutUsd || 0).toFixed(2)}`} color="text-accent-green" chip="bg-accent-green/10" border="border-accent-green/25 hover:border-accent-green/45 hover:shadow-glow-green" hairline="via-accent-green/50" delay={210} />
        </div>

        {/* Withdraw button */}
        <div className="animate-rise">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled
            className="w-full min-h-[48px] py-3 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green/40 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed no-select"
          >
            Withdraw Funds <ArrowRight className="w-4 h-4" />
          </motion.button>
          <p className="text-white/35 text-[10px] text-center mt-2">Stripe Connect payouts launching soon. Every dollar is tracked and safe.</p>
        </div>

        {/* Per-stream breakdown */}
        <div className="animate-rise">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-1">
            Every stream, counted
          </p>
          <h3 className="text-lg font-extrabold tracking-tight text-white mb-3">Stream revenue</h3>
          <div className="space-y-2">
            {(data?.streams || []).length === 0 && (
              <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] py-8 px-4 text-center">
                <div
                  className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"
                  aria-hidden
                />
                <p className="text-white/45 text-sm">No streams with revenue yet — go live and let the gifts roll in</p>
              </div>
            )}
            {(data?.streams || []).map(s => (
              <div key={s.streamId}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStream(selectedStream === s.streamId ? null : s.streamId)}
                  className="w-full min-h-[56px] bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex items-center justify-between hover:border-accent-green/30 transition-colors no-select"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                    <p className="text-white/40 text-[10px] flex items-center gap-1 mt-0.5">
                      {s.date} &middot; <Gift className="w-3 h-3 text-accent-amber/70 inline" /> {s.giftsCount} gifts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-accent-green font-extrabold tracking-tight text-base">${(s.netCents / 100).toFixed(2)}</p>
                      <p className="text-white/35 text-[10px] uppercase tracking-[0.14em]">net</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/35 transition-transform ${selectedStream === s.streamId ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>
                {selectedStream === s.streamId && creatorId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 mb-2"
                  >
                    <EarningsBreakdown streamId={s.streamId} creatorId={creatorId} />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payout info */}
        <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] p-4 animate-rise">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"
            aria-hidden
          />
          <p className="text-accent-green/80 text-[10px] font-semibold uppercase tracking-[0.28em] mb-1">How payouts work</p>
          <p className="text-white/45 text-xs">210 threads = $1.00 USD &middot; Platform fee: 20% &middot; Minimum payout: $10</p>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color, chip, border, hairline, delay = 0 }: { icon: any; label: string; value: string; color: string; chip?: string; border?: string; hairline?: string; delay?: number }) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.04] backdrop-blur-xl rounded-2xl border ${border || 'border-white/[0.08]'} p-4 transition-all duration-300 animate-rise`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent ${hairline || 'via-white/20'} to-transparent`}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-6 h-6 rounded-lg ${chip || 'bg-white/[0.06]'} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <span className="text-[10px] text-white/40 uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className={`font-extrabold tracking-tight text-xl ${color}`}>{value}</p>
    </div>
  );
}
