import { motion } from 'framer-motion';
import { Crown, Sparkles, Video, Lock, Shield, Users } from 'lucide-react';
import { TiltCard } from '@/components/3d/couture/TiltCard';

interface Props {
  onSubscribe: () => void;
  creatorName: string;
}

// Tier colors match the Live Effects catalog (src/lib/liveEffects/catalog.ts):
// SUPPORTER = sky #38D6FF, VIP = violet #7C5CFF, INNER_CIRCLE = amber #FFB020.
const TIERS = [
  {
    name: 'Supporter',
    price: '$4.99/mo',
    icon: Shield,
    color: 'text-accent-sky',
    dot: 'bg-accent-sky',
    frame: 'border border-accent-sky/25 shadow-glow-cyan',
    benefits: ['Subscriber badge in chat', 'Support your favorite creator', 'Priority notifications'],
    highlight: false,
    elite: false,
  },
  {
    name: 'VIP',
    price: '$24.99/mo',
    icon: Crown,
    color: 'text-accent-violet',
    dot: 'bg-accent-violet',
    frame: 'border border-accent-violet/30 shadow-glow-violet',
    benefits: ['VIP badge in chat & profile', 'Suite selection priority', 'Exclusive content access', 'Direct message access'],
    highlight: true,
    elite: false,
  },
  {
    name: 'Inner Circle',
    price: '$44.99/mo',
    icon: Sparkles,
    color: 'text-accent-amber',
    dot: 'bg-accent-amber',
    frame: 'border border-accent-amber/30 shadow-glow-amber',
    benefits: ['Inner Circle badge', 'First access to Suite', 'Exclusive live streams', 'Behind-the-scenes content', 'Higher chance to join Be With Me Suite'],
    highlight: false,
    elite: true,
  },
];

export function VipValueCard({ onSubscribe, creatorName }: Props) {
  return (
    <div className="space-y-3">
      {/* Invitation — warm, universal */}
      <div className="mb-3 animate-rise opacity-0">
        <p className="text-[11px] tracking-[0.28em] uppercase text-white/40 mb-1">Memberships</p>
        <h3 className="text-2xl font-extrabold tracking-tight leading-[1.05] text-white">
          Get closer to <span className="text-celebration">{creatorName}</span>
        </h3>
      </div>

      {/* Key value props — glass tilt tiles */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { icon: Video, label: 'Join Suite Live', desc: 'FaceTime-style with creator', color: 'text-accent-sky' },
          { icon: Crown, label: 'VIP Badge', desc: 'Stand out in chat', color: 'text-accent-violet' },
          { icon: Lock, label: 'Exclusive Content', desc: 'Subscriber-only access', color: 'text-brand-400' },
          { icon: Users, label: 'Priority Selection', desc: 'First pick for Suite', color: 'text-accent-green' },
        ].map((item, i) => (
          <TiltCard key={item.label} intensity="subtle">
            <div
              className="glass-couture !rounded-2xl p-3 animate-rise opacity-0"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <item.icon className={`w-4 h-4 ${item.color} mb-1.5`} />
              <p className="text-white text-[11px] font-bold">{item.label}</p>
              <p className="text-white/35 text-[11px] mt-0.5">{item.desc}</p>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Tier comparison mini */}
      <div className="space-y-2.5">
        {TIERS.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={`relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl p-3.5 ${tier.frame} animate-rise opacity-0`}
              style={{ animationDelay: `${180 + i * 90}ms` }}
            >
              {tier.elite && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/60 to-transparent pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${tier.color}`} />
                  <span className={`text-base font-bold tracking-tight leading-none ${tier.color}`}>
                    {tier.name}
                  </span>
                  {tier.highlight && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-violet/15 border border-accent-violet/30 text-accent-violet text-[11px] font-bold tracking-wider uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold ${tier.elite ? 'text-accent-amber' : 'text-white/55'}`}>{tier.price}</span>
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {tier.benefits.slice(0, 3).map(b => (
                  <span key={b} className="text-white/35 text-[11px] flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${tier.dot} flex-shrink-0`} /> {b}
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
        className="btn-couture w-full min-h-[48px] text-sm"
      >
        Become a member
      </motion.button>
    </div>
  );
}
