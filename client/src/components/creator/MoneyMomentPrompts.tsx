import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, X, Flame, Crown, Target, Clock, TrendingUp, Zap } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface MoneyMoment {
  id: string;
  type: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  emoji: string;
}

const TYPE_STYLES: Record<string, { icon: typeof Flame; color: string; bg: string; border: string }> = {
  gift_ask: { icon: DollarSign, color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30' },
  vip_push: { icon: Crown, color: 'text-violet-400', bg: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/30' },
  supporter_battle: { icon: Zap, color: 'text-red-400', bg: 'from-red-500/20 to-orange-500/10', border: 'border-red-500/30' },
  milestone: { icon: Target, color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/10', border: 'border-green-500/30' },
  engagement_peak: { icon: TrendingUp, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30' },
  timing: { icon: Clock, color: 'text-brand-400', bg: 'from-brand-500/20 to-pink-500/10', border: 'border-brand-500/30' },
};

const URGENCY_GLOW: Record<string, string> = {
  high: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  medium: '',
  low: '',
};

export function MoneyMomentPrompts({ streamId }: { streamId: string }) {
  const [moments, setMoments] = useState<MoneyMoment[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll every 30 seconds for new money moments
    const fetchMoments = () => {
      apiFetch(`/api/streams/${streamId}/money-moments`)
        .then(res => setMoments(res.moments || []))
        .catch(() => {});
    };

    fetchMoments();
    intervalRef.current = setInterval(fetchMoments, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [streamId]);

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]));
  }

  const visible = moments.filter(m => !dismissed.has(m.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Flame className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Money Moments</span>
      </div>

      <AnimatePresence>
        {visible.map((moment, i) => {
          const style = TYPE_STYLES[moment.type] || TYPE_STYLES.gift_ask;
          const Icon = style.icon;

          return (
            <motion.div
              key={moment.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-gradient-to-r ${style.bg} backdrop-blur-sm rounded-xl border ${style.border} p-3 ${URGENCY_GLOW[moment.urgency]}`}
            >
              {/* Dismiss */}
              <button
                onClick={() => dismiss(moment.id)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>

              <div className="flex items-start gap-2.5 pr-6">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-lg">{moment.emoji}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className={`w-3 h-3 ${style.color}`} />
                    <p className={`text-xs font-bold ${style.color}`}>{moment.title}</p>
                    {moment.urgency === 'high' && (
                      <span className="bg-red-500/20 text-red-400 text-[8px] font-bold px-1 py-0.5 rounded">NOW</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{moment.description}</p>
                </div>
              </div>

              {/* Pulse indicator for high urgency */}
              {moment.urgency === 'high' && (
                <div className="absolute top-2 left-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
