import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Sparkles, Check, Loader2, Flame, Crown, Zap, Gift, Clock } from 'lucide-react';
import { isIAPAvailable, purchaseThreads, syncThreadPurchaseToBackend } from '@/services/iap';
import { useIAPStore } from '@/store/iapStore';
import { haptic } from '@/utils/native';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 4 tiers — spec pricing with conversion-optimized layout
const PACKAGES = [
  {
    id: 'pack_500',
    appleProductId: 'threads_500',
    threads: 500,
    bonusThreads: 0,
    price: '$4.99',
    priceCents: 499,
    perThread: '$0.010',
    icon: Coins,
    color: 'text-white/70',
    borderColor: 'border-white/10',
    bgColor: 'bg-white/[0.03]',
    socialProof: 'Good for a few gifts',
  },
  {
    id: 'pack_1050',
    appleProductId: 'threads_1050',
    threads: 1000,
    bonusThreads: 200,
    price: '$9.99',
    priceCents: 999,
    perThread: '$0.008',
    icon: Flame,
    color: 'text-brand-400',
    borderColor: 'border-brand-500/30',
    bgColor: 'bg-brand-500/5',
    tag: 'MOST POPULAR',
    tagColor: 'bg-brand-500',
    highlight: true,
    socialProof: 'Most supporters choose this',
  },
  {
    id: 'pack_5500',
    appleProductId: 'threads_5500',
    threads: 3000,
    bonusThreads: 500,
    price: '$24.99',
    priceCents: 2499,
    perThread: '$0.007',
    icon: Crown,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5',
    tag: 'BEST VALUE',
    tagColor: 'bg-amber-500',
    savings: '20% extra coins',
    socialProof: 'Best coin value',
  },
  {
    id: 'pack_11500',
    appleProductId: 'threads_11500',
    threads: 7000,
    bonusThreads: 1000,
    price: '$49.99',
    priceCents: 4999,
    perThread: '$0.006',
    icon: Sparkles,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-gradient-to-br from-violet-500/10 to-amber-500/5',
    tag: 'VIP PACK',
    tagColor: 'bg-gradient-to-r from-violet-500 to-amber-500',
    savings: '30% extra coins',
    socialProof: 'For top supporters',
  },
];

interface BuyCoinsModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchased?: (newBalance: number) => void;
}

export function BuyCoinsModal({ open, onClose, currentBalance, onPurchased }: BuyCoinsModalProps) {
  const [selected, setSelected] = useState<number>(1); // Default to "Most Popular"
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  const useAppleIAP = isIAPAvailable();
  const iapStore = useIAPStore();

  useEffect(() => {
    if (open && useAppleIAP && !iapStore.available) {
      iapStore.initialize();
    }
    if (open) setSelected(1); // Reset to popular on open
  }, [open]);

  async function handlePurchase() {
    if (purchasing) return;
    const pkg = PACKAGES[selected];
    haptic('medium');
    setPurchasing(true);
    setError('');

    if (useAppleIAP) {
      try {
        const me = JSON.parse(localStorage.getItem('user') || '{}');
        const result = await purchaseThreads(pkg.appleProductId, me.id || '');

        if (result.status === 'success' && result.transaction) {
          haptic('success');
          try {
            const { balance } = await syncThreadPurchaseToBackend(result.transaction);
            onPurchased?.(balance);
            onClose();
            window.location.reload();
          } catch {
            setError('Purchase complete! Threads will appear shortly.');
            setTimeout(() => { onClose(); window.location.reload(); }, 2000);
          }
        } else if (result.status === 'cancelled') {
          // noop
        } else if (result.status === 'pending') {
          setError('Purchase is pending approval.');
        } else {
          setError('Purchase failed. Please try again.');
        }
      } catch (err: any) {
        setError(err.message || 'Purchase failed');
      }
      setPurchasing(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/threads/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || 'Payment failed');
      } else if (data.url) {
        window.location.href = data.url;
      } else if (data.devMode) {
        haptic('success');
        onPurchased?.(data.balance);
        onClose();
        window.location.reload();
      }
    } catch {
      setError('Payment failed. Please try again.');
    }
    setPurchasing(false);
  }

  if (!open) return null;

  const pkg = PACKAGES[selected];
  const totalThreads = pkg.threads + pkg.bonusThreads;
  const iapProduct = useAppleIAP
    ? iapStore.products.find(p => p.id === pkg.appleProductId)
    : undefined;
  const displayPrice = iapProduct?.displayPrice || pkg.price;

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
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-surface-dark rounded-t-3xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-lg font-extrabold">Get Threads</h3>
                <p className="text-white/40 text-xs">Send gifts to your favorite creators</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Balance pill */}
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-white/50 text-xs">Balance:</span>
              <span className="text-white font-bold text-sm">{currentBalance.toLocaleString()}</span>
              <span className="text-white/30 text-xs">threads</span>
            </div>
          </div>

          {/* Urgency banner */}
          <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/15">
            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300/80 text-[10px] font-medium">Limited bonus threads on all packs this week</p>
          </div>

          {/* What coins are for */}
          <div className="mx-5 mb-3 flex items-center gap-3 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><Gift className="w-3 h-3 text-amber-400" /> Send gifts</span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-violet-400" /> Get noticed</span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand-400" /> Top supporter</span>
          </div>

          {/* Package list — vertical cards, larger tap targets */}
          <div className="px-5 space-y-2.5 pb-3">
            {PACKAGES.map((p, i) => {
              const isSelected = selected === i;
              const Icon = p.icon;
              const iapProd = useAppleIAP
                ? iapStore.products.find(pr => pr.id === p.appleProductId)
                : undefined;
              const price = iapProd?.displayPrice || p.price;
              const total = p.threads + p.bonusThreads;

              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelected(i); haptic('light'); }}
                  className={`relative w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? `${p.borderColor} ${p.bgColor} ring-1 ring-brand-500/20`
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  } ${(p as any).highlight ? 'scale-[1.02]' : ''}`}
                >
                  {/* Tag */}
                  {(p as any).tag && (
                    <div className={`absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full ${(p as any).tagColor} text-[8px] font-extrabold text-white tracking-wider`}>
                      {(p as any).tag}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl ${isSelected ? p.bgColor : 'bg-white/[0.04]'} border ${isSelected ? p.borderColor : 'border-white/[0.06]'} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white font-extrabold text-base">{total.toLocaleString()}</span>
                      <span className="text-white/30 text-[10px]">threads</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.bonusThreads > 0 && (
                        <span className="text-emerald-400 text-[10px] font-bold">+{p.bonusThreads.toLocaleString()} bonus</span>
                      )}
                      {(p as any).savings && (
                        <span className="text-emerald-400/60 text-[9px]">{(p as any).savings}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold text-sm">{price}</p>
                    <p className="text-white/20 text-[9px]">{(p as any).socialProof || `${p.perThread}/ea`}</p>
                  </div>

                  {/* Selection indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-brand-500 bg-brand-500' : 'border-white/20'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 pb-2">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Purchase button */}
          <div className="px-5 pb-6 pt-1 safe-area-pb">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full py-4 rounded-2xl gradient-premium text-white font-bold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {purchasing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Get {totalThreads.toLocaleString()} Threads — {displayPrice}
                </>
              )}
            </motion.button>
            <p className="text-center text-white/15 text-[10px] mt-2">
              {useAppleIAP ? 'Payment via Apple' : 'Secure payment · Cancel anytime'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
