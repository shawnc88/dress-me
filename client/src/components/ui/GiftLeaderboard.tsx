import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Coins } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LeaderEntry {
  rank: number;
  user: { username: string; displayName: string; avatarUrl?: string | null };
  totalThreads: number;
  giftCount: number;
}

export function GiftLeaderboard({ streamId }: { streamId: string }) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/viral/leaderboard/${streamId}`)
      .then(r => r.ok ? r.json() : { leaderboard: [] })
      .then(data => setLeaders(data.leaderboard || []))
      .catch(() => {});
  }, [streamId]);

  if (leaders.length === 0) return null;

  const rankColors = ['text-amber-400', 'text-gray-300', 'text-amber-600'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-bold text-sm">Top Gifters</h3>
      </div>
      {leaders.slice(0, 5).map((entry, i) => (
        <motion.div
          key={entry.rank}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2"
        >
          <span className={`w-6 text-center font-bold text-sm ${rankColors[i] || 'text-gray-500'}`}>
            {entry.rank}
          </span>
          <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-500/20 flex-shrink-0">
            {entry.user.avatarUrl ? (
              <img src={entry.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-brand-400">
                {entry.user.displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{entry.user.displayName}</p>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 text-xs font-bold">{entry.totalThreads.toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
