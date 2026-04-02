import { motion } from 'framer-motion';
import { Check, Star, Crown, Users, Zap } from 'lucide-react';

interface TierCardPremiumProps {
  tier: 'basic' | 'premium' | 'elite';
  price: number; // cents
  active?: boolean;
  onSelect?: () => void;
}

const TIER_CONFIG = {
  basic: {
    label: 'Free',
    icon: Users,
    gradient: 'from-gray-700 to-gray-800',
    border: 'border-white/10',
    glow: '',
    perks: ['Watch public streams', 'Join chat', 'Enter free giveaways'],
  },
  premium: {
    label: 'Premium',
    icon: Star,
    gradient: 'from-brand-600 to-brand-800',
    border: 'border-brand-500/30',
    glow: 'shadow-glow-sm',
    perks: ['All Free perks', 'Exclusive streams', 'Priority chat', 'Custom badge', '3x raffle tickets'],
  },
  elite: {
    label: 'Elite',
    icon: Crown,
    gradient: 'from-amber-600 via-amber-500 to-yellow-600',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    perks: ['All Premium perks', 'VIP access', '1-on-1 sessions', 'Elite badge', '10x raffle tickets'],
  },
};

export function TierCardPremium({ tier, price, active = false, onSelect }: TierCardPremiumProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  const priceDisplay = price === 0 ? 'Free' : `$${(price / 100).toFixed(2)}/mo`;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`relative w-full text-left rounded-3xl overflow-hidden transition-all ${
        active ? `${config.border} ${config.glow}` : 'border-white/5'
      } border bg-charcoal`}
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${config.gradient} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">{config.label}</h3>
            <p className="text-white/70 text-xs">{priceDisplay}</p>
          </div>
        </div>
        {active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      {/* Perks */}
      <div className="px-5 py-4 space-y-2.5">
        {config.perks.map((perk, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Zap className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
            <span className="text-gray-400 text-sm">{perk}</span>
          </div>
        ))}
      </div>

      {/* Subscribe CTA */}
      {!active && price > 0 && (
        <div className="px-5 pb-4">
          <div className={`w-full py-2.5 rounded-2xl text-center text-sm font-bold text-white bg-gradient-to-r ${config.gradient} hover:brightness-110 transition-all`}>
            Subscribe {priceDisplay}
          </div>
        </div>
      )}
    </motion.button>
  );
}
