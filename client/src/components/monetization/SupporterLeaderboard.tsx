import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Coins, Trophy } from 'lucide-react';
import { VipBadge } from '@/components/ui/VipBadge';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LeaderEntry {
  rank: number;
  user: { username: string; displayName: string; avatarUrl?: string | null };
  totalThreads: number;
  giftCount: number;
  tier: string | null;
}

interface Props {
  creatorId: string;
  compact?: boolean; // For embedding in live room sidebar
}

/** Podium framing — amber / silver / orange for the top three. */
const PODIUM = [
  { frame: 'border border-accent-amber/40 shadow-glow-amber', rank: 'text-accent-amber', ring: 'ring-1 ring-accent-amber/40' },
  { frame: 'border border-white/20', rank: 'text-white/70', ring: 'ring-1 ring-white/25' },
  { frame: 'border border-accent-orange/30', rank: 'text-accent-orange', ring: 'ring-1 ring-accent-orange/30' },
];

export function SupporterLeaderboard({ creatorId, compact }: Props) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const { track } = useMonetizationEvents();

  useEffect(() => {
    fetch(`${API_URL}/api/monetization/leaderboard/${creatorId}`)
      .then(r => r.ok ? r.json() : { leaderboard: [] })
      .then(data => {
        setLeaders(data.leaderboard || []);
        if (data.leaderboard?.length > 0) {
          track('leaderboard_view', { creatorId });
        }
      })
      .catch(() => {});
  }, [creatorId, track]);

  if (leaders.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
        <Crown className="w-4 h-4 text-accent-amber/60 mx-auto mb-1.5" />
        <p className="text-white/40 text-sm font-semibold">No supporters yet</p>
        <p className="text-white/20 text-[10px] mt-1">Send gifts during live streams to appear here</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-baseline gap-2 mb-2.5">
        <Trophy className="w-4 h-4 text-accent-amber self-center" />
        <h3 className="text-white text-lg font-extrabold tracking-tight leading-none">
          Top supporters
        </h3>
        <span className="text-white/25 text-[9px] tracking-[0.18em] uppercase">All time</span>
      </div>
      {leaders.slice(0, compact ? 5 : 10).map((entry, i) => {
        const podium = i < 3 ? PODIUM[i] : null;
        return (
          <motion.div
            key={entry.user.username}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-2.5 backdrop-blur-xl ${
              compact ? 'rounded-xl px-2.5 py-1.5' : 'rounded-2xl px-3 py-2.5'
            } ${podium ? `bg-white/[0.04] ${podium.frame}` : 'bg-white/[0.03] border border-white/[0.06]'}`}
          >
            <span className={`w-6 text-center font-bold ${compact ? 'text-sm' : 'text-base'} ${podium ? podium.rank : 'text-white/30'}`}>
              {i === 0 ? <Crown className="w-4 h-4 text-accent-amber mx-auto" /> : entry.rank}
            </span>
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full overflow-hidden bg-brand-500/20 flex-shrink-0 ${podium ? podium.ring : ''}`}>
              {entry.user.avatarUrl ? (
                <img src={entry.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-brand-400">
                  {entry.user.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-white font-semibold truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {entry.user.displayName}
                </p>
                {entry.tier && <VipBadge tier={entry.tier.toLowerCase()} size="sm" />}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Coins className="w-3 h-3 text-accent-amber" />
              <span className={`text-xs font-bold ${podium ? 'text-accent-amber' : 'text-accent-amber/70'}`}>{entry.totalThreads.toLocaleString()}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
