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
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
        <Crown className="w-4 h-4 text-amber-400/40 mx-auto mb-1" />
        <p className="text-white/15 text-[10px]">Send gifts during live streams to appear here</p>
      </div>
    );
  }

  const rankIcons = ['🥇', '🥈', '🥉'];

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-bold text-sm">Top Supporters</h3>
        <span className="text-white/20 text-[10px]">All time</span>
      </div>
      {leaders.slice(0, compact ? 5 : 10).map((entry, i) => (
        <motion.div
          key={entry.user.username}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`flex items-center gap-2.5 ${compact ? 'bg-white/[0.03] rounded-xl px-2.5 py-1.5' : 'bg-white/5 rounded-2xl px-3 py-2.5'}`}
        >
          <span className={`w-6 text-center font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
            {i < 3 ? rankIcons[i] : <span className="text-white/30">{entry.rank}</span>}
          </span>
          <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full overflow-hidden bg-brand-500/20 flex-shrink-0`}>
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
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 text-xs font-bold">{entry.totalThreads.toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
