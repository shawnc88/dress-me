import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Flame, Crown, TrendingUp, Clock, Gift,
  Zap, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface EarningsMoment {
  timestamp: string;
  minuteMark: number;
  threads: number;
  usd: string;
  giftCount: number;
  topGiftType: string;
}

interface TopSupporter {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalThreads: number;
  giftCount: number;
  topGift: string;
}

interface Breakdown {
  streamId: string;
  streamTitle: string;
  duration: number;
  totalThreads: number;
  totalUsd: string;
  totalGifts: number;
  peakMoment: EarningsMoment | null;
  earningsTimeline: EarningsMoment[];
  topSupporters: TopSupporter[];
  giftTypeBreakdown: Array<{ type: string; count: number; threads: number }>;
  strategy: string;
  strategyDetail: string;
}

const GIFT_EMOJIS: Record<string, string> = {
  heart: '❤️', sparkle: '✨', star: '⭐', diamond: '💎', crown: '👑', fire: '🔥',
};

export function EarningsBreakdown({ streamId, creatorId }: { streamId: string; creatorId: string }) {
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    apiFetch(`/api/creators/${creatorId}/earnings-breakdown?streamId=${streamId}`)
      .then(res => setData(res.breakdown))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [streamId, creatorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalGifts === 0) {
    return (
      <div className="bg-surface-card rounded-2xl border border-white/5 p-6 text-center">
        <Gift className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No gifts received yet</p>
        <p className="text-xs text-gray-600 mt-1">Keep engaging — your first gift is coming!</p>
      </div>
    );
  }

  const maxTimelineThreads = Math.max(...data.earningsTimeline.map(t => t.threads), 1);

  return (
    <div className="space-y-4">
      {/* ─── Total Earnings Hero ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 rounded-2xl border border-amber-500/20 p-5 text-center"
      >
        <DollarSign className="w-8 h-8 text-amber-400 mx-auto mb-1" />
        <p className="text-3xl font-bold text-white">${data.totalUsd}</p>
        <p className="text-xs text-amber-400/60 mt-1">
          {data.totalGifts} gifts &middot; {data.totalThreads.toLocaleString()} threads
        </p>
      </motion.div>

      {/* ─── Peak Moment ─── */}
      {data.peakMoment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-card rounded-2xl border border-red-500/20 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 uppercase">Peak Moment</p>
              <p className="text-[10px] text-gray-500">Highest earning window</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-white">${data.peakMoment.usd}</span>
            <span className="text-xs text-gray-500">in 3 minutes</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-400">
              Minute {data.peakMoment.minuteMark}–{data.peakMoment.minuteMark + 3} &middot; {data.peakMoment.giftCount} gifts &middot; {GIFT_EMOJIS[data.peakMoment.topGiftType] || '🎁'} most sent
            </span>
          </div>
        </motion.div>
      )}

      {/* ─── Top Supporters ─── */}
      {data.topSupporters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-bold text-white">Top Supporters</p>
          </div>
          <div className="space-y-2">
            {data.topSupporters.map((supporter, i) => (
              <div key={supporter.userId} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-center ${
                  i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'
                }`}>
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  {supporter.avatarUrl ? (
                    <img src={supporter.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      {supporter.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{supporter.displayName}</p>
                  <p className="text-[10px] text-gray-500">{supporter.giftCount} gifts &middot; {GIFT_EMOJIS[supporter.topGift] || '🎁'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{supporter.totalThreads.toLocaleString()}</p>
                  <p className="text-[9px] text-gray-600">threads</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Strategy Insight ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-brand-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl border border-brand-500/20 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-brand-500" />
          <p className="text-sm font-bold text-white">Best Strategy</p>
        </div>
        <p className="text-sm font-semibold text-brand-300">{data.strategy}</p>
        <p className="text-xs text-gray-400 mt-1">{data.strategyDetail}</p>
      </motion.div>

      {/* ─── Earnings Timeline (expandable) ─── */}
      {data.earningsTimeline.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden"
        >
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <p className="text-sm font-bold text-white">Earnings Timeline</p>
            </div>
            {showTimeline ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {showTimeline && (
            <div className="px-4 pb-4">
              {/* Visual bar chart */}
              <div className="flex items-end gap-1 h-20 mb-3">
                {data.earningsTimeline.map((moment, i) => {
                  const height = (moment.threads / maxTimelineThreads) * 100;
                  const isPeak = data.peakMoment && moment.minuteMark === data.peakMoment.minuteMark;
                  return (
                    <motion.div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-0.5"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isPeak ? 'bg-amber-400' : 'bg-brand-500/60'
                        }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </motion.div>
                  );
                })}
              </div>
              {/* Labels */}
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>0 min</span>
                <span>{data.earningsTimeline[data.earningsTimeline.length - 1]?.minuteMark + 3} min</span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mt-3">
                {data.earningsTimeline.map((moment, i) => {
                  const isPeak = data.peakMoment && moment.minuteMark === data.peakMoment.minuteMark;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                        isPeak ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-gray-400">
                        min {moment.minuteMark}–{moment.minuteMark + 3}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{moment.giftCount} gifts</span>
                        <span className={`font-bold ${isPeak ? 'text-amber-400' : 'text-white'}`}>
                          ${moment.usd}
                        </span>
                        {isPeak && <Flame className="w-3 h-3 text-amber-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Gift Type Breakdown ─── */}
      {data.giftTypeBreakdown.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface-card rounded-2xl border border-white/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-bold text-white">Gift Breakdown</p>
          </div>
          <div className="space-y-2">
            {data.giftTypeBreakdown.map((g) => {
              const pct = Math.round((g.threads / data.totalThreads) * 100);
              return (
                <div key={g.type} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{GIFT_EMOJIS[g.type] || '🎁'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-white capitalize">{g.type}</span>
                      <span className="text-[10px] text-gray-500">{g.count}x &middot; {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 w-14 text-right">
                    {g.threads.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
