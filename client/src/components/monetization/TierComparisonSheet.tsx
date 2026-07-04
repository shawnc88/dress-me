import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Crown, Sparkles, Check, Minus } from 'lucide-react';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectTier: (tier: string) => void;
  creatorId: string;
}

// Tier colors match the Live Effects catalog (src/lib/liveEffects/catalog.ts):
// SUPPORTER = sky #38D6FF, VIP = violet #7C5CFF, INNER_CIRCLE = amber #FFB020.
const TIERS = [
  { key: 'SUPPORTER', label: 'Supporter', price: '$4.99', icon: Shield, color: 'text-accent-sky', frame: 'bg-accent-sky/[0.08] border border-accent-sky/25 shadow-glow-cyan', check: 'text-accent-sky', highlight: false, elite: false },
  { key: 'VIP', label: 'VIP', price: '$24.99', icon: Crown, color: 'text-accent-violet', frame: 'bg-accent-violet/[0.08] border border-accent-violet/30 shadow-glow-violet', check: 'text-accent-violet', highlight: true, elite: false },
  { key: 'INNER_CIRCLE', label: 'Inner Circle', price: '$44.99', icon: Sparkles, color: 'text-accent-amber', frame: 'bg-accent-amber/[0.06] border border-accent-amber/30 shadow-glow-amber', check: 'text-accent-amber', highlight: false, elite: true },
];

const FEATURES = [
  { label: 'Chat badge', tiers: ['SUPPORTER', 'VIP', 'INNER_CIRCLE'] },
  { label: 'Priority notifications', tiers: ['SUPPORTER', 'VIP', 'INNER_CIRCLE'] },
  { label: 'Exclusive content', tiers: ['VIP', 'INNER_CIRCLE'] },
  { label: 'Suite selection priority', tiers: ['VIP', 'INNER_CIRCLE'] },
  { label: 'Direct message access', tiers: ['VIP', 'INNER_CIRCLE'] },
  { label: 'First Suite access', tiers: ['INNER_CIRCLE'] },
  { label: 'Behind-the-scenes', tiers: ['INNER_CIRCLE'] },
  { label: 'Higher Suite selection chance', tiers: ['INNER_CIRCLE'] },
];

export function TierComparisonSheet({ open, onClose, onSelectTier, creatorId }: Props) {
  const { track } = useMonetizationEvents();

  useEffect(() => {
    if (open) track('tier_comparison_view', { creatorId });
  }, [open, creatorId, track]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg celebration-canvas grain rounded-t-[28px] overflow-hidden max-h-[85vh] overflow-y-auto border-t border-white/10 shadow-couture"
          onClick={e => e.stopPropagation()}
        >
          {/* Multicolor crest + ambient glow (pure CSS — no WebGL under a sheet) */}
          <div className="absolute top-0 left-0 right-0 h-px gradient-celebration opacity-60 pointer-events-none" />
          <div className="absolute -top-12 left-1/4 w-56 h-44 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-6 right-0 w-44 h-44 bg-accent-cyan/[0.08] rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="relative px-5 pt-2 pb-4">
            <div className="flex items-start justify-between mb-5 gap-3">
              <div className="animate-rise opacity-0">
                <p className="text-[9px] tracking-[0.28em] uppercase text-white/40 mb-1">Memberships</p>
                <h3 className="text-2xl font-extrabold tracking-tight leading-[1.05] text-white">
                  Compare plans
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 -mt-1 -mr-1.5 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <span className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/60" />
                </span>
              </button>
            </div>

            {/* Tier headers */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div /> {/* Empty for feature label column */}
              {TIERS.map(t => {
                const Icon = t.icon;
                return (
                  <div key={t.key} className={`relative overflow-hidden text-center rounded-2xl p-2.5 backdrop-blur-xl ${t.frame}`}>
                    {t.elite && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/60 to-transparent pointer-events-none" />
                    )}
                    <Icon className={`w-4 h-4 ${t.color} mx-auto mb-1`} />
                    <p className={`text-[11px] font-bold leading-tight ${t.color}`}>{t.label}</p>
                    <p className="text-white/50 text-[9px] mt-0.5">{t.price}</p>
                  </div>
                );
              })}
            </div>

            {/* Feature rows */}
            <div className="space-y-0 rounded-2xl bg-white/[0.02] border border-white/[0.05] px-3">
              {FEATURES.map((f, i) => (
                <div key={f.label} className={`grid grid-cols-4 gap-2 py-3 ${i < FEATURES.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <p className="text-white/50 text-[10px] font-medium">{f.label}</p>
                  {TIERS.map(t => (
                    <div key={t.key} className="flex justify-center">
                      {f.tiers.includes(t.key) ? (
                        <Check className={`w-4 h-4 ${t.check}`} />
                      ) : (
                        <Minus className="w-4 h-4 text-white/10" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-3 gap-2 mt-5 pb-4 safe-area-pb">
              {TIERS.map(t => (
                <motion.button
                  key={t.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectTier(t.key)}
                  className={`min-h-[44px] py-3 rounded-full text-[10px] font-bold transition-all ${t.highlight
                    ? 'btn-couture !px-2 !py-3'
                    : t.elite
                      ? 'bg-accent-amber/10 border border-accent-amber/30 text-accent-amber shadow-glow-amber'
                      : `bg-white/[0.04] backdrop-blur-xl border border-white/10 ${t.color}`
                  }`}
                >
                  Choose {t.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
