import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Gift, Users, MessageCircle, Heart, Star } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface StreamEarning {
  streamId: string;
  title: string;
  startedAt: string | null;
  status: string;
  peakViewers: number;
  chatMessages: number;
  giftCount: number;
  grossUsd: string;
  netUsd: string;
}

interface EarningsSummary {
  totalStreams: number;
  totalGiftCount: number;
  totalGrossUsd: string;
  totalNetUsd: string;
  threadBalance: number;
  platformFeeRate: string;
}

export function CreatorEarningsCard() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [streams, setStreams] = useState<StreamEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ summary: EarningsSummary; streams: StreamEarning[] }>('/api/engagement/earnings-summary')
      .then((data) => {
        setSummary(data.summary);
        setStreams(data.streams);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-card rounded-2xl border border-white/5 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/3" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-xl font-bold text-white">${summary.totalNetUsd}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Net Earnings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">{summary.totalGiftCount}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gifts Received</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-xl font-bold text-white">${summary.totalGrossUsd}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gross Revenue</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-xl font-bold text-white">{summary.threadBalance}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Thread Balance</p>
        </motion.div>
      </div>

      {/* Per-Stream Earnings */}
      {streams.length > 0 && (
        <div className="bg-surface-card rounded-2xl border border-white/5 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Stream Earnings</h3>
          <div className="space-y-2.5">
            {streams.slice(0, 10).map((s, i) => (
              <motion.div
                key={s.streamId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{s.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{s.peakViewers}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{s.chatMessages}</span>
                    <span className="flex items-center gap-0.5"><Gift className="w-3 h-3" />{s.giftCount}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-green-400">${s.netUsd}</p>
                  <p className="text-[10px] text-gray-600">${s.grossUsd} gross</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
