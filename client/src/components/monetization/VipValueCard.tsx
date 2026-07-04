import { motion } from 'framer-motion';
import { Crown, Sparkles, Video, Lock, Shield, Users } from 'lucide-react';
import { TiltCard } from '@/components/3d/couture/TiltCard';

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
    dot: 'bg-brand-400',
    frame: 'border border-brand-500/20',
    benefits: ['Subscriber badge in chat', 'Support your favorite creator', 'Priority notifications'],
    highlight: false,
    elite: false,
  },
  {
    name: 'VIP',
    price: '$24.99/mo',
    icon: Crown,
    color: 'text-violet-300',
    dot: 'bg-violet-400',
    frame: 'border border-violet-500/30 shadow-glow-violet',
    benefits: ['VIP badge in chat & profile', 'Suite selection priority', 'Exclusive content access', 'Direct message access'],
    highlight: true,
    elite: false,
  },
  {
    name: 'Inner Circle',
    price: '$44.99/mo',
    icon: Sparkles,
    color: 'text-gold-300',
    dot: 'bg-gold-300',
    frame: 'gold-hairline shadow-gold-sm',
    benefits: ['Inner Circle badge', 'First access to Suite', 'Exclusive live streams', 'Behind-the-scenes content', 'Higher chance to join Be With Me Suite'],
    highlight: false,
    elite: true,
  },
];

export function VipValueCard({ onSubscribe, creatorName }: Props) {
  return (
    <div className="space-y-3">
      {/* Editorial invitation */}
      <div className="mb-3 animate-rise opacity-0">
        <p className="text-[9px] tracking-[0.28em] uppercase text-gold-300/70 mb-1">Members Only</p>
        <h3 className="editorial text-2xl leading-[1.02] text-white">
          Step inside <span className="text-couture-gold">{creatorName}</span>&rsquo;s world
        </h3>
      </div>

      {/* Key value props — glass tilt tiles */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { icon: Video, label: 'Join Suite Live', desc: 'FaceTime-style with creator', color: 'text-violet-300' },
          { icon: Crown, label: 'VIP Badge', desc: 'Stand out in chat', color: 'text-gold-300' },
          { icon: Lock, label: 'Exclusive Content', desc: 'Subscriber-only access', color: 'text-brand-400' },
          { icon: Users, label: 'Priority Selection', desc: 'First pick for Suite', color: 'text-emerald-400' },
        ].map((item, i) => (
          <TiltCard key={item.label} intensity="subtle">
            <div
              className="glass-couture !rounded-2xl p-3 animate-rise opacity-0"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <item.icon className={`w-4 h-4 ${item.color} mb-1.5`} />
              <p className="text-white text-[11px] font-bold">{item.label}</p>
              <p className="text-white/35 text-[9px] mt-0.5">{item.desc}</p>
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
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${tier.color}`} />
                  <span className={`editorial text-base leading-none ${tier.elite ? 'text-couture-gold' : tier.color}`}>
                    {tier.name}
                  </span>
                  {tier.highlight && (
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[8px] font-bold tracking-wider uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold ${tier.elite ? 'text-gold-300' : 'text-white/55'}`}>{tier.price}</span>
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {tier.benefits.slice(0, 3).map(b => (
                  <span key={b} className="text-white/35 text-[9px] flex items-center gap-1">
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
        Subscribe to {creatorName}
      </motion.button>
    </div>
  );
}
