import { motion } from 'framer-motion';
import { Crown, Star, Sparkles, Check, Users, Lock } from 'lucide-react';

interface CreatorTierCardProps {
  tier: {
    id: string;
    name: string;
    priceCents: number;
    yearlyPriceCents?: number | null;
    description: string;
    benefits: string[];
    slotLimit?: number | null;
    subscriberCount?: number;
  };
  isCurrentTier?: boolean;
  onSubscribe: (tierId: string) => void;
  onUpgrade?: (tierId: string) => void;
  disabled?: boolean;
}

const TIER_CONFIG = {
  SUPPORTER: {
    icon: Star,
    gradient: 'from-brand-500/20 to-pink-500/10',
    border: 'border-brand-500/20',
    badge: 'bg-brand-500/20 text-brand-400',
    button: 'bg-brand-500 hover:bg-brand-600',
    glow: 'shadow-brand-500/20',
    label: 'Supporter',
  },
  VIP: {
    icon: Crown,
    gradient: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-500/25',
    badge: 'bg-violet-500/20 text-violet-400',
    button: 'bg-violet-500 hover:bg-violet-600',
    glow: 'shadow-violet-500/20',
    label: 'VIP',
  },
  INNER_CIRCLE: {
    icon: Sparkles,
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/25',
    badge: 'bg-amber-500/20 text-amber-400',
    button: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    glow: 'shadow-amber-500/20',
    label: 'Inner Circle',
  },
};

export function CreatorTierCard({ tier, isCurrentTier, onSubscribe, onUpgrade, disabled }: CreatorTierCardProps) {
  const config = TIER_CONFIG[tier.name as keyof typeof TIER_CONFIG] || TIER_CONFIG.SUPPORTER;
  const Icon = config.icon;
  const price = (tier.priceCents / 100).toFixed(2);
  const isFull = tier.slotLimit ? (tier.subscriberCount || 0) >= tier.slotLimit : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${config.gradient} border ${config.border} p-5 relative overflow-hidden`}
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${config.badge} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white text-sm font-bold">{config.label}</h3>
              <p className="text-white/40 text-[10px]">{tier.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-lg font-extrabold">${price}</p>
            <p className="text-white/30 text-[10px]">/month</p>
            {tier.yearlyPriceCents && (
              <p className="text-emerald-400/60 text-[9px] font-medium">
                or ${(tier.yearlyPriceCents / 100).toFixed(2)}/yr — save {Math.round((1 - tier.yearlyPriceCents / (tier.priceCents * 12)) * 100)}%
              </p>
            )}
          </div>
        </div>

        {/* Slot limit indicator */}
        {tier.slotLimit && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <Users className="w-3 h-3 text-white/40" />
            <span className="text-white/50 text-[10px] font-medium">
              {tier.subscriberCount || 0} / {tier.slotLimit} spots filled
            </span>
            {isFull && <span className="ml-auto text-red-400 text-[10px] font-bold">FULL</span>}
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-2 mb-4">
          {tier.benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-white/60 text-xs leading-relaxed">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        {isCurrentTier ? (
          <div className="w-full py-2.5 rounded-lg bg-white/10 text-white/50 text-xs font-bold text-center border border-white/10">
            Current Plan
          </div>
        ) : isFull ? (
          <div className="w-full py-2.5 rounded-lg bg-white/5 text-white/30 text-xs font-bold text-center border border-white/5 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> Tier Full
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onUpgrade ? onUpgrade(tier.id) : onSubscribe(tier.id)}
            disabled={disabled}
            className={`w-full py-2.5 rounded-lg ${config.button} text-white text-xs font-bold shadow-lg ${config.glow} transition-all disabled:opacity-50`}
          >
            {onUpgrade ? 'Upgrade' : 'Subscribe'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
