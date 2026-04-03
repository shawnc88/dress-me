import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Sparkles, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Package {
  threads: number;
  price: string;
  priceCents: number;
  bonus?: string;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { threads: 100, price: '$0.99', priceCents: 99 },
  { threads: 500, price: '$4.49', priceCents: 449 },
  { threads: 1050, price: '$8.99', priceCents: 899, bonus: '+5% bonus' },
  { threads: 2200, price: '$17.99', priceCents: 1799, bonus: '+10% bonus', popular: true },
  { threads: 5500, price: '$42.99', priceCents: 4299, bonus: '+15% bonus' },
  { threads: 11500, price: '$84.99', priceCents: 8499, bonus: '+20% bonus' },
];

interface BuyCoinsModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchased: (newBalance: number) => void;
}

export function BuyCoinsModal({ open, onClose, currentBalance, onPurchased }: BuyCoinsModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handlePurchase() {
    if (selected === null || purchasing) return;
    const pkg = PACKAGES[selected];
    setPurchasing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/threads/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageIndex: selected, threads: pkg.threads, amountCents: pkg.priceCents }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        onPurchased(data.newBalance || currentBalance + pkg.threads);
        setTimeout(() => { setSuccess(false); onClose(); }, 1500);
      }
    } catch {}
    setPurchasing(false);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-lg bg-surface-dark rounded-t-3xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-bold">Buy Threads</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Current balance */}
          <div className="px-5 py-3 bg-white/5">
            <p className="text-white/60 text-xs">Current Balance</p>
            <p className="text-white font-bold text-lg">{currentBalance.toLocaleString()} threads</p>
          </div>

          {/* Packages */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {PACKAGES.map((pkg, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`relative p-4 rounded-2xl border text-left transition-all ${
                  selected === i
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-brand-500 text-[9px] font-bold text-white flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> POPULAR
                  </div>
                )}
                <p className="text-white font-bold text-lg">{pkg.threads.toLocaleString()}</p>
                <p className="text-white/40 text-xs">threads</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-white font-semibold text-sm">{pkg.price}</span>
                  {pkg.bonus && (
                    <span className="text-emerald-400 text-[10px] font-bold">{pkg.bonus}</span>
                  )}
                </div>
                {selected === i && (
                  <div className="absolute top-2 left-2">
                    <Check className="w-4 h-4 text-brand-500" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Purchase button */}
          <div className="px-5 pb-6 pt-2 safe-area-pb">
            {success ? (
              <div className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Purchase Complete!
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={selected === null || purchasing}
                className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold disabled:opacity-30 transition-opacity"
              >
                {purchasing ? 'Processing...' : selected !== null ? `Buy ${PACKAGES[selected].threads.toLocaleString()} Threads for ${PACKAGES[selected].price}` : 'Select a Package'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
