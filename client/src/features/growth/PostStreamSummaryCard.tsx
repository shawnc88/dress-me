import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Heart, MessageCircle, Gift, TrendingUp, UserPlus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Summary {
  duration: number;
  peakViewers: number;
  totalViewers: number;
  newFollowers: number;
  giftsReceived: number;
  giftValueThreads: number;
  chatMessages: number;
  avgWatchTimeMs: number;
  repeatViewerRate: number;
  topFans: Array<{ id: string; username: string; displayName: string; avatarUrl?: string }>;
}

interface PostStreamSummaryCardProps {
  creatorId: string;
  streamId: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PostStreamSummaryCard({ creatorId, streamId }: PostStreamSummaryCardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // First try to fetch existing summary
    fetch(`${API_URL}/api/creators/${creatorId}/post-stream-summary?streamId=${streamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.summary) setSummary(data.summary);
        else generateSummary(token);
      })
      .catch(() => generateSummary(token));
  }, [creatorId, streamId]);

  async function generateSummary(token: string) {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/creators/${creatorId}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ streamId }),
      });
      const data = await res.json();
      if (data?.summary) setSummary(data.summary);
    } catch {}
    setGenerating(false);
  }

  if (!summary && !generating) return null;

  if (generating) {
    return (
      <div className="bg-surface-card rounded-2xl border border-white/5 p-6 text-center">
        <TrendingUp className="w-8 h-8 text-brand-500 mx-auto mb-2 animate-pulse" />
        <p className="text-white/60 text-sm">Generating your stream summary...</p>
      </div>
    );
  }

  if (!summary) return null;

  const stats = [
    { icon: Users, label: 'Peak Viewers', value: summary.peakViewers },
    { icon: Clock, label: 'Duration', value: formatDuration(summary.duration) },
    { icon: UserPlus, label: 'New Followers', value: `+${summary.newFollowers}` },
    { icon: Gift, label: 'Gifts', value: `${summary.giftsReceived} (${summary.giftValueThreads} threads)` },
    { icon: MessageCircle, label: 'Chat Messages', value: summary.chatMessages },
    { icon: TrendingUp, label: 'Repeat Viewers', value: `${Math.round(summary.repeatViewerRate * 100)}%` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-card rounded-2xl border border-white/5 p-5">
      <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-brand-500" />
        Stream Summary
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-white font-bold text-lg">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top Fans */}
      {summary.topFans?.length > 0 && (
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Top Fans</p>
          <div className="flex items-center gap-2">
            {summary.topFans.map(fan => (
              <div key={fan.id} className="flex items-center gap-1.5 bg-white/5 rounded-full pl-1 pr-3 py-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10">
                  {fan.avatarUrl ? (
                    <img src={fan.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/40">
                      {fan.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-white text-[10px] font-medium">@{fan.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
