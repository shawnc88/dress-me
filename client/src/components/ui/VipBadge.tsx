import { Crown, Star, Gem, Shield } from 'lucide-react';

const TIER_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  inner_circle: { label: 'Inner Circle', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  elite: { label: 'Elite', icon: Gem, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  vip: { label: 'VIP', icon: Star, color: 'text-brand-500', bg: 'bg-brand-500/20' },
  supporter: { label: 'Supporter', icon: Shield, color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export function VipBadge({ tier, size = 'sm' }: { tier: string; size?: 'sm' | 'md' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.supporter;
  const Icon = config.icon;

  if (size === 'md') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${config.bg} ${config.color} text-xs font-bold`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold ${config.bg} ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

export function ChatVipBadge({ tier }: { tier: string }) {
  if (tier === 'supporter') return null;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.supporter;
  const Icon = config.icon;

  return (
    <span className={`ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold ${config.bg} ${config.color}`}>
      <Icon className="w-2 h-2" />
    </span>
  );
}
