import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Sparkles, Check, ExternalLink, Loader2, Apple } from 'lucide-react';
import { isIAPAvailable, purchaseThreads, syncThreadPurchaseToBackend, THREAD_PRODUCT_MAP } from '@/services/iap';
import { useIAPStore } from '@/store/iapStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Package {
  id: string;
  appleProductId: string;
  threads: number;
  price: string;
  priceCents: number;
  bonus?: string;
  popular?: boolean;
}

const PACKAGES: (Package & { tag?: string; savings?: string })[] = [
  { id: 'pack_100', appleProductId: 'threads_100', threads: 100, price: '$0.99', priceCents: 99, tag: 'Starter' },
  { id: 'pack_500', appleProductId: 'threads_500', threads: 500, price: '$4.49', priceCents: 449, bonus: '+5%' },
  { id: 'pack_1050', appleProductId: 'threads_1050', threads: 1050, price: '$8.99', priceCents: 899, bonus: '+10%', tag: 'Best for gifting' },
  { id: 'pack_2200', appleProductId: 'threads_2200', threads: 2200, price: '$17.99', priceCents: 1799, bonus: '+15%', popular: true, savings: 'Save 15%' },
  { id: 'pack_5500', appleProductId: 'threads_5500', threads: 5500, price: '$42.99', priceCents: 4299, bonus: '+20%', tag: 'VIP Pick', savings: 'Save 20%' },
  { id: 'pack_11500', appleProductId: 'threads_11500', threads: 11500, price: '$84.99', priceCents: 8499, bonus: '+25%', tag: 'Best Value', savings: 'Save 25%' },
];

interface BuyCoinsModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchased?: (newBalance: number) => void;
}

export function BuyCoinsModal({ open, onClose, currentBalance, onPurchased }: BuyCoinsModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  const useAppleIAP = isIAPAvailable();
  const iapStore = useIAPStore();

  // Initialize IAP if on iOS
  useEffect(() => {
    if (open && useAppleIAP && !iapStore.available) {
      iapStore.initialize();
    }
  }, [open, useAppleIAP]);

  async function handlePurchase() {
    if (selected === null || purchasing) return;
    const pkg = PACKAGES[selected];
    setPurchasing(true);
    setError('');

    // iOS: use Apple IAP for consumable purchase
    if (useAppleIAP) {
      try {
        const me = JSON.parse(localStorage.getItem('user') || '{}');
        const result = await purchaseThreads(pkg.appleProductId, me.id || '');

        if (result.status === 'success' && result.transaction) {
          // Sync purchase to backend to credit threads
          try {
            const { balance } = await syncThreadPurchaseToBackend(result.transaction);
            onPurchased?.(balance);
            onClose();
            window.location.reload();
          } catch (syncErr: any) {
            // Purchase succeeded on Apple but sync failed — threads will credit on next app open
            setError('Purchase complete! Threads will appear shortly.');
            setTimeout(() => { onClose(); window.location.reload(); }, 2000);
          }
        } else if (result.status === 'cancelled') {
          // User cancelled — do nothing
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

    // Web: use Stripe or dev-mode
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
        onPurchased?.(data.balance);
        onClose();
        window.location.reload();
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
    }
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

          {/* Balance */}
          <div className="px-5 py-3 bg-white/5">
            <p className="text-white/60 text-xs">Current Balance</p>
            <p className="text-white font-bold text-lg">{currentBalance.toLocaleString()} threads</p>
          </div>

          {/* Packages */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {PACKAGES.map((pkg, i) => {
              // On iOS, show Apple IAP price if available
              const iapProduct = useAppleIAP
                ? iapStore.products.find(p => p.id === pkg.appleProductId)
                : undefined;
              const displayPrice = iapProduct?.displayPrice || pkg.price;

              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(i)}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    selected === i
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand-500 text-[9px] font-bold text-white flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> RECOMMENDED
                    </div>
                  )}
                  {(pkg as any).tag && !pkg.popular && (
                    <div className="absolute -top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-amber-300 bg-amber-500/20 leading-none">
                      {(pkg as any).tag}
                    </div>
                  )}
                  <p className="text-white font-bold text-lg">{pkg.threads.toLocaleString()}</p>
                  <p className="text-white/40 text-xs">threads</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white font-semibold text-sm">{displayPrice}</span>
                    {pkg.bonus && (
                      <span className="text-emerald-400 text-[10px] font-bold">{pkg.bonus}</span>
                    )}
                  </div>
                  {(pkg as any).savings && (
                    <p className="text-emerald-400/70 text-[9px] font-medium mt-0.5">{(pkg as any).savings}</p>
                  )}
                  {selected === i && (
                    <div className="absolute top-2 left-2">
                      <Check className="w-4 h-4 text-brand-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 pb-2">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Purchase button */}
          <div className="px-5 pb-6 pt-2 safe-area-pb">
            <button
              onClick={handlePurchase}
              disabled={selected === null || purchasing}
              className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
            >
              {purchasing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : selected !== null ? (
                <>Buy {PACKAGES[selected].threads.toLocaleString()} Threads for {
                  (useAppleIAP
                    ? iapStore.products.find(p => p.id === PACKAGES[selected].appleProductId)?.displayPrice
                    : undefined) || PACKAGES[selected].price
                }</>
              ) : 'Select a Package'}
            </button>
            <p className="text-center text-white/20 text-[10px] mt-2">
              {useAppleIAP ? 'Payment via Apple' : 'Secure payment via Stripe'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
