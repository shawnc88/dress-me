import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Permanent top-3 gifter stack in the live room — the Bigo mechanic that
// drives competitive spending: status has to be PUBLIC to be worth buying.
// Tap opens the full leaderboard sheet.
interface Leader {
  rank: number;
  user: { username: string; displayName: string; avatarUrl?: string | null } | null;
  totalThreads: number;
}

export function TopGifters({ streamId, onOpen }: { streamId: string; onOpen: () => void }) {
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`${API_URL}/api/viral/leaderboard/${streamId}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled && d?.leaderboard) setLeaders(d.leaderboard.slice(0, 3)); })
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [streamId]);

  if (leaders.length === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      aria-label="Top supporters"
      className="pointer-events-auto flex items-center gap-1.5 min-h-[44px] rounded-full bg-ink-950/55 backdrop-blur-xl border border-accent-amber/25 pl-2.5 pr-3 py-1 no-select"
    >
      <Crown className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
      <div className="flex -space-x-2">
        {leaders.map(l => (
          <div key={l.rank} className="w-7 h-7 rounded-full overflow-hidden border-2 border-ink-950 bg-ink-800">
            {l.user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white/70">
                {(l.user?.displayName || '?').charAt(0)}
              </div>
            )}
          </div>
        ))}
      </div>
      <span className="text-white/70 text-[11px] font-bold">Top fans</span>
    </motion.button>
  );
}
