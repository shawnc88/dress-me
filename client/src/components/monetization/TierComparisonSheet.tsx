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

const TIERS = [
  { key: 'SUPPORTER', label: 'Supporter', price: '$4.99', icon: Shield, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20', highlight: false },
  { key: 'VIP', label: 'VIP', price: '$24.99', icon: Crown, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', highlight: true },
  { key: 'INNER_CIRCLE', label: 'Inner Circle', price: '$44.99', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', highlight: false },
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
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-surface-dark rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="px-5 pt-2 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-extrabold">Compare Plans</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Tier headers */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div /> {/* Empty for feature label column */}
              {TIERS.map(t => {
                const Icon = t.icon;
                return (
                  <div key={t.key} className={`text-center rounded-xl p-2 ${t.bg} ${t.highlight ? 'ring-1 ring-violet-500/30' : ''}`}>
                    <Icon className={`w-4 h-4 ${t.color} mx-auto mb-1`} />
                    <p className={`text-[10px] font-bold ${t.color}`}>{t.label}</p>
                    <p className="text-white/50 text-[9px]">{t.price}</p>
                  </div>
                );
              })}
            </div>

            {/* Feature rows */}
            <div className="space-y-0">
              {FEATURES.map((f, i) => (
                <div key={f.label} className={`grid grid-cols-4 gap-2 py-2.5 ${i < FEATURES.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <p className="text-white/50 text-[10px] font-medium">{f.label}</p>
                  {TIERS.map(t => (
                    <div key={t.key} className="flex justify-center">
                      {f.tiers.includes(t.key) ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-white/10" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4 pb-4 safe-area-pb">
              {TIERS.map(t => (
                <motion.button
                  key={t.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectTier(t.key)}
                  className={`py-2.5 rounded-xl text-[10px] font-bold border ${t.highlight
                    ? 'bg-gradient-to-r from-violet-500 to-brand-500 text-white border-transparent shadow-lg shadow-violet-500/20'
                    : `${t.bg} ${t.color} ${t.border}`
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
