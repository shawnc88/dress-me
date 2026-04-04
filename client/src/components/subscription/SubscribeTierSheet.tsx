import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { CreatorTierCard } from './CreatorTierCard';
import { apiFetch } from '@/utils/api';

interface SubscribeTierSheetProps {
  creatorId: string;
  creatorName: string;
  isOpen: boolean;
  onClose: () => void;
  currentTierId?: string | null;
}

export function SubscribeTierSheet({ creatorId, creatorName, isOpen, onClose, currentTierId }: SubscribeTierSheetProps) {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!isOpen || !creatorId) return;
    setLoading(true);
    apiFetch(`/api/creator-tiers/${creatorId}`)
      .then(data => setTiers(data.tiers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, creatorId]);

  async function handleSubscribe(tierId: string) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    setSubscribing(true);
    try {
      const data = await apiFetch('/api/fan-subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ tierId }),
      });

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.subscription) {
        // Dev mode: subscription created directly
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUpgrade(tierId: string) {
    setSubscribing(true);
    try {
      await apiFetch('/api/fan-subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ creatorId, newTierId: tierId }),
      });
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to upgrade');
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-dark border-t border-white/10"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-white text-lg font-bold">Subscribe to {creatorName}</h2>
                  <p className="text-white/40 text-xs">Choose your level of access</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Security badge */}
              <div className="flex items-center gap-1.5 mb-5 text-emerald-400/60 text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure payment via Stripe. Cancel anytime.</span>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
              ) : tiers.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/30 text-sm">This creator hasn't set up subscription tiers yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tiers.map(tier => (
                    <CreatorTierCard
                      key={tier.id}
                      tier={tier}
                      isCurrentTier={tier.id === currentTierId}
                      onSubscribe={handleSubscribe}
                      onUpgrade={currentTierId ? handleUpgrade : undefined}
                      disabled={subscribing}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
