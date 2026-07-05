import { motion } from 'framer-motion';
import { Crown, Star, Sparkles, Check, Users, Lock } from 'lucide-react';
import { TiltCard } from '@/components/3d/couture/TiltCard';

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

/**
 * Universal tier voices — colors match the Live Effects catalog (src/lib/liveEffects/catalog.ts):
 *  - SUPPORTER    → cyan/sky (#38D6FF) — fresh, welcoming
 *  - VIP          → violet (#7C5CFF) — premium depth
 *  - INNER_CIRCLE → amber (#FFB020) — top-tier spotlight
 */
const TIER_CONFIG = {
  SUPPORTER: {
    icon: Star,
    aura: 'from-accent-sky/[0.12] via-transparent to-transparent',
    frame: 'border border-accent-sky/25 shadow-glow-cyan',
    badge: 'bg-accent-sky/15 text-accent-sky border border-accent-sky/25',
    accent: 'text-accent-sky',
    check: 'text-accent-sky',
    glow: 'bg-accent-sky/15',
    label: 'Supporter',
    elite: false,
  },
  VIP: {
    icon: Crown,
    aura: 'from-accent-violet/[0.14] via-transparent to-transparent',
    frame: 'border border-accent-violet/30 shadow-glow-violet',
    badge: 'bg-accent-violet/15 text-accent-violet border border-accent-violet/30',
    accent: 'text-accent-violet',
    check: 'text-accent-violet',
    glow: 'bg-accent-violet/15',
    label: 'VIP',
    elite: false,
  },
  INNER_CIRCLE: {
    icon: Sparkles,
    aura: 'from-accent-amber/[0.14] via-transparent to-transparent',
    frame: 'border border-accent-amber/30 shadow-glow-amber',
    badge: 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30',
    accent: 'text-accent-amber',
    check: 'text-accent-amber',
    glow: 'bg-accent-amber/15',
    label: 'Inner Circle',
    elite: true,
  },
};

export function CreatorTierCard({ tier, isCurrentTier, onSubscribe, onUpgrade, disabled }: CreatorTierCardProps) {
  const config = TIER_CONFIG[tier.name as keyof typeof TIER_CONFIG] || TIER_CONFIG.SUPPORTER;
  const Icon = config.icon;
  const price = (tier.priceCents / 100).toFixed(2);
  const isFull = tier.slotLimit ? (tier.subscriberCount || 0) >= tier.slotLimit : false;

  return (
    <TiltCard intensity="subtle" className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-4xl glass-couture ${config.frame} p-5`}
      >
        {/* Tier aura wash + soft glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.aura} pointer-events-none`} />
        <div className={`absolute -top-10 -right-10 w-36 h-36 ${config.glow} rounded-full blur-3xl pointer-events-none`} />

        {/* Top-tier ribbon — amber spotlight for Inner Circle */}
        {config.elite && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/70 to-transparent pointer-events-none" />
        )}

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-2xl ${config.badge} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xl font-extrabold tracking-tight leading-none ${config.elite ? 'text-accent-amber' : 'text-white'}`}>
                  {config.label}
                </h3>
                <p className="text-white/40 text-[11px] mt-1 truncate">{tier.description}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-3xl font-extrabold tracking-tight leading-none ${config.elite ? 'text-accent-amber' : 'text-white'}`}>
                ${price}
              </p>
              <p className="text-white/30 text-[11px] mt-0.5 tracking-wider uppercase">per month</p>
              {tier.yearlyPriceCents && (
                <p className="text-emerald-400/70 text-[11px] font-medium mt-0.5">
                  or ${(tier.yearlyPriceCents / 100).toFixed(2)}/yr — save {Math.round((1 - tier.yearlyPriceCents / (tier.priceCents * 12)) * 100)}%
                </p>
              )}
            </div>
          </div>

          {/* Slot limit indicator */}
          {tier.slotLimit && (
            <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <Users className={`w-3 h-3 ${config.accent}`} />
              <span className="text-white/50 text-[11px] font-medium">
                {tier.subscriberCount || 0} / {tier.slotLimit} spots taken
              </span>
              {isFull && <span className="ml-auto text-live text-[11px] font-bold tracking-wider">FULL</span>}
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-2.5 mb-5">
            {tier.benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 animate-rise opacity-0"
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                <Check className={`w-3.5 h-3.5 ${config.check} mt-0.5 flex-shrink-0`} />
                <span className="text-white/65 text-xs leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {isCurrentTier ? (
            <div className="w-full min-h-[44px] py-3 rounded-full bg-white/[0.06] text-white/50 text-xs font-bold text-center border border-white/10 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Your Current Plan
            </div>
          ) : isFull ? (
            <div className="w-full min-h-[44px] py-3 rounded-full bg-white/[0.03] text-white/30 text-xs font-bold text-center border border-white/5 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Tier Full
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpgrade ? onUpgrade(tier.id) : onSubscribe(tier.id)}
              disabled={disabled}
              className={`btn-couture w-full min-h-[48px] text-sm disabled:opacity-50 ${
                config.elite ? 'shadow-glow-amber' : ''
              }`}
            >
              {onUpgrade ? `Upgrade to ${config.label}` : `Become a ${config.label}`}
            </motion.button>
          )}
        </div>
      </motion.div>
    </TiltCard>
  );
}
