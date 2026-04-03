import { useState, useEffect } from 'react';
import { Eye, Heart, MessageCircle, Gift, Share2, UserPlus, Zap } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface Metrics {
  currentViewers: number;
  peakViewers: number;
  likes: number;
  comments: number;
  gifts: number;
  giftThreads: number;
  shares: number;
  followConversions: number;
  engagementScore: number;
}

export function LiveStreamMetrics({ streamId }: { streamId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchMetrics = () => {
      apiFetch<{ metrics: Metrics }>(`/api/engagement/${streamId}/metrics`)
        .then((data) => setMetrics(data.metrics))
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (!metrics) return null;

  const items = [
    { icon: Eye, label: 'Viewers', value: metrics.currentViewers, color: 'text-blue-400' },
    { icon: Eye, label: 'Peak', value: metrics.peakViewers, color: 'text-cyan-400' },
    { icon: Heart, label: 'Likes', value: metrics.likes, color: 'text-red-400' },
    { icon: MessageCircle, label: 'Chat', value: metrics.comments, color: 'text-violet-400' },
    { icon: Gift, label: 'Gifts', value: metrics.gifts, color: 'text-amber-400' },
    { icon: UserPlus, label: 'Follows', value: metrics.followConversions, color: 'text-green-400' },
    { icon: Share2, label: 'Shares', value: metrics.shares, color: 'text-brand-400' },
    { icon: Zap, label: 'Score', value: metrics.engagementScore, color: 'text-yellow-400' },
  ];

  return (
    <div className="bg-surface-card rounded-2xl border border-white/5 p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        Live Metrics
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center py-2">
            <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
            <p className="text-sm font-bold text-white">
              {item.value > 999 ? `${(item.value / 1000).toFixed(1)}K` : item.value}
            </p>
            <p className="text-[9px] text-gray-600 uppercase">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
