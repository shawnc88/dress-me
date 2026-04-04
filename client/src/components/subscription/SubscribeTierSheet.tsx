import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldCheck, RotateCcw, XCircle, AlertTriangle } from 'lucide-react';
import { CreatorTierCard } from './CreatorTierCard';
import { apiFetch } from '@/utils/api';

interface SubscribeTierSheetProps {
  creatorId: string;
  creatorName: string;
  isOpen: boolean;
  onClose: () => void;
  currentTierId?: string | null;
  currentSubStatus?: string | null;
  currentSubProvider?: string | null;
  currentSubCancelAtPeriodEnd?: boolean;
  currentSubPeriodEnd?: string | null;
}

export function SubscribeTierSheet({
  creatorId, creatorName, isOpen, onClose, currentTierId,
  currentSubStatus, currentSubProvider, currentSubCancelAtPeriodEnd, currentSubPeriodEnd,
}: SubscribeTierSheetProps) {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !creatorId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/creator-tiers/${creatorId}`)
      .then(data => setTiers(data.tiers || []))
      .catch((err) => setError(err.message || 'Failed to load tiers'))
      .finally(() => setLoading(false));
  }, [isOpen, creatorId]);

  async function handleSubscribe(tierId: string) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/auth/login'; return; }

    setSubscribing(true);
    setError(null);
    try {
      const data = await apiFetch('/api/fan-subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ tierId }),
      });
      if (data.url) {
        window.location.href = data.url;
      } else if (data.subscription) {
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUpgrade(tierId: string) {
    setSubscribing(true);
    setError(null);
    try {
      await apiFetch('/api/fan-subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ creatorId, newTierId: tierId }),
      });
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You\'ll keep access until the end of your current billing period.')) return;
    setCanceling(true);
    setError(null);
    try {
      await apiFetch('/api/fan-subscriptions/cancel', {
        method: 'POST',
        body: JSON.stringify({ creatorId }),
      });
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel');
    } finally {
      setCanceling(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setRestoreResult(null);
    setError(null);
    try {
      // In a real iOS app, StoreKit 2 provides signedTransactions.
      // For web, we call the restore endpoint with empty array to trigger server-side check.
      const data = await apiFetch('/api/fan-subscriptions/restore', {
        method: 'POST',
        body: JSON.stringify({ signedTransactions: [] }),
      });
      if (data.count > 0) {
        setRestoreResult(`Restored ${data.count} subscription(s)`);
        setTimeout(() => { onClose(); window.location.reload(); }, 1500);
      } else {
        setRestoreResult('No purchases found to restore');
      }
    } catch (err: any) {
      setError(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  const isSubscribed = currentSubStatus === 'ACTIVE';
  const isCanceling = currentSubCancelAtPeriodEnd;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-dark border-t border-white/10"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 pb-8 safe-area-pb">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-white text-lg font-bold">
                    {isSubscribed ? 'Manage Subscription' : `Subscribe to ${creatorName}`}
                  </h2>
                  <p className="text-white/40 text-xs">
                    {isSubscribed ? `Subscribed to ${creatorName}` : 'Choose your level of access'}
                  </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Security / provider badge */}
              <div className="flex items-center gap-1.5 mb-4 text-emerald-400/60 text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure payment. Cancel anytime.</span>
              </div>

              {/* Error display */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 text-xs font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400/60 text-[10px] mt-1 underline">Dismiss</button>
                  </div>
                </div>
              )}

              {/* Active subscription status */}
              {isSubscribed && (
                <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-violet-300 text-xs font-bold">
                      {isCanceling ? 'Canceling at period end' : 'Active subscription'}
                    </span>
                    {currentSubProvider === 'APPLE_IAP' && (
                      <span className="text-white/30 text-[9px] px-1.5 py-0.5 rounded bg-white/5">via Apple</span>
                    )}
                  </div>
                  {currentSubPeriodEnd && (
                    <p className="text-white/40 text-[10px]">
                      {isCanceling ? 'Access until' : 'Renews'}: {new Date(currentSubPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}

              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
              ) : tiers.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/30 text-sm">This creator hasn't set up subscription tiers yet.</p>
                </div>
              ) : (
                <>
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

                  {/* ─── Subscription Terms (required for iOS) ─── */}
                  <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-white/30 text-[10px] leading-relaxed">
                      Subscriptions auto-renew monthly at the price shown unless canceled at least 24 hours before the end of the current period.
                      Your account will be charged for renewal within 24 hours prior to the end of the current period.
                      {' '}Manage or cancel subscriptions in your Apple ID Settings or account settings.
                      {' '}No refunds for partial billing periods.
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]">
                      <a href="/terms" className="text-white/30 underline">Terms of Service</a>
                      <a href="/privacy" className="text-white/30 underline">Privacy Policy</a>
                    </div>
                  </div>
                </>
              )}

              {/* ─── Cancel Subscription ─── */}
              {isSubscribed && !isCanceling && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCancel}
                  disabled={canceling}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {canceling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Cancel Subscription
                </motion.button>
              )}

              {/* Apple IAP note for cancel */}
              {isSubscribed && currentSubProvider === 'APPLE_IAP' && (
                <p className="mt-2 text-white/20 text-[10px] text-center">
                  To cancel an Apple subscription, go to Settings → Apple ID → Subscriptions
                </p>
              )}

              {/* ─── Restore Purchases ─── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRestore}
                disabled={restoring}
                className="w-full mt-3 py-2 rounded-xl bg-white/[0.02] text-white/30 text-[10px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Restore Purchases
              </motion.button>

              {restoreResult && (
                <p className="mt-1 text-center text-emerald-400/60 text-[10px]">{restoreResult}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
