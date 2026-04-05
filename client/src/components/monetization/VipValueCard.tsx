import { motion } from 'framer-motion';
import { Crown, Star, Sparkles, Video, Lock, Shield, Zap, Users } from 'lucide-react';

interface Props {
  onSubscribe: () => void;
  creatorName: string;
}

const TIERS = [
  {
    name: 'Supporter',
    price: '$4.99/mo',
    icon: Shield,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
    benefits: ['Subscriber badge in chat', 'Support your favorite creator', 'Priority notifications'],
  },
  {
    name: 'VIP',
    price: '$14.99/mo',
    icon: Crown,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    benefits: ['VIP badge in chat & profile', 'Suite selection priority', 'Exclusive content access', 'Direct message access'],
    highlight: true,
  },
  {
    name: 'Inner Circle',
    price: '$29.99/mo',
    icon: Sparkles,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    benefits: ['Inner Circle badge', 'First access to Suite', 'Exclusive live streams', 'Behind-the-scenes content', 'Higher chance to join Be With Me Suite'],
  },
];

export function VipValueCard({ onSubscribe, creatorName }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-bold text-sm">Why Subscribe?</h3>
      </div>

      {/* Key value props */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { icon: Video, label: 'Join Suite Live', desc: 'FaceTime-style with creator', color: 'text-violet-400' },
          { icon: Crown, label: 'VIP Badge', desc: 'Stand out in chat', color: 'text-amber-400' },
          { icon: Lock, label: 'Exclusive Content', desc: 'Subscriber-only access', color: 'text-brand-400' },
          { icon: Users, label: 'Priority Selection', desc: 'First pick for Suite', color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
            <item.icon className={`w-4 h-4 ${item.color} mb-1`} />
            <p className="text-white text-[11px] font-bold">{item.label}</p>
            <p className="text-white/30 text-[9px]">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Tier comparison mini */}
      <div className="space-y-2">
        {TIERS.map(tier => {
          const Icon = tier.icon;
          return (
            <div key={tier.name} className={`rounded-xl p-3 border ${tier.border} ${tier.bg} ${tier.highlight ? 'ring-1 ring-violet-500/20' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${tier.color}`} />
                  <span className={`text-xs font-bold ${tier.color}`}>{tier.name}</span>
                </div>
                <span className="text-white/40 text-[10px] font-medium">{tier.price}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tier.benefits.slice(0, 3).map(b => (
                  <span key={b} className="text-white/30 text-[9px] flex items-center gap-0.5">
                    <Zap className="w-2 h-2" /> {b}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSubscribe}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-brand-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20"
      >
        Subscribe to {creatorName}
      </motion.button>
    </div>
  );
}
