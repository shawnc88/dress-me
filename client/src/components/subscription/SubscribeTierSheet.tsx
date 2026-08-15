import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldCheck, RotateCcw, XCircle, AlertTriangle } from 'lucide-react';
import { CreatorTierCard } from './CreatorTierCard';
import { apiFetch } from '@/utils/api';
import {
  isIAPAvailable,
  getActiveSubscriptions,
  pickFreeSlotProduct,
  productForTierInGroup,
  slotGroupIndexOf,
} from '@/services/iap';
import { useIAPStore } from '@/store/iapStore';

interface AppleMembership {
  creatorId: string;
  creatorName: string;
  tierName: string;
  providerSubscriptionId?: string | null;
}

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
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  // Apple allows ONE active subscription per subscription group per Apple ID.
  // The membership slot groups (bwm_s2..s5) let a fan hold up to 5 concurrent
  // creator memberships; track ALL of them plus the device's active StoreKit
  // transactions so a tier tap buys into a free slot when one exists and only
  // offers a switch when every slot is taken (or the slot products haven't
  // been approved by App Review yet — they don't load until then).
  const [myMemberships, setMyMemberships] = useState<AppleMembership[]>([]);
  const [activeTxs, setActiveTxs] = useState<{ productId: string; originalTransactionId: string }[]>([]);
  const [switchTarget, setSwitchTarget] = useState<any | null>(null);
  const [switchFrom, setSwitchFrom] = useState<AppleMembership | null>(null);
  const [switching, setSwitching] = useState(false);

  const useAppleIAP = isIAPAvailable();
  const iapStore = useIAPStore();

  useEffect(() => {
    if (!isOpen || !creatorId) return;
    setLoading(true);
    setError(null);

    // Load tiers from backend
    const loadTiers = apiFetch(`/api/creator-tiers/${creatorId}`)
      .then(data => setTiers(data.tiers || []))
      .catch((err) => setError(err.message || 'Failed to load tiers'));

    // Initialize IAP products if on iOS. Also re-initialize when a previous
    // attempt yielded ZERO products (transient StoreKit/network failure) —
    // otherwise every subsequent purchase tap dead-ends on "Product not
    // available" with no recovery until app relaunch.
    const loadIAP = useAppleIAP && (!iapStore.available || iapStore.products.length === 0)
      ? iapStore.initialize()
      : Promise.resolve();

    // iOS: find ALL the user's active Apple memberships across the platform
    const loadMemberships = useAppleIAP && localStorage.getItem('token')
      ? apiFetch('/api/fan-subscriptions/me')
          .then((d) => {
            const subs = (d.subscriptions || []).filter(
              (s: any) => s.provider === 'APPLE_IAP' && s.status === 'ACTIVE',
            );
            setMyMemberships(subs.map((sub: any) => ({
              creatorId: sub.creatorId,
              creatorName: sub.creator?.user?.displayName || sub.creator?.user?.username || 'another creator',
              tierName: sub.tier?.name || 'SUPPORTER',
              providerSubscriptionId: sub.providerSubscriptionId,
            })));
          })
          .catch(() => {})
      : Promise.resolve();

    // iOS: the device's active StoreKit transactions tell us which slot
    // groups are occupied on this Apple ID (and which group each membership
    // lives in, for plan changes).
    const loadActiveTxs = useAppleIAP
      ? getActiveSubscriptions()
          .then((txs) => setActiveTxs(txs.map(t => ({
            productId: t.productId,
            originalTransactionId: t.originalTransactionId,
          }))))
          .catch(() => {})
      : Promise.resolve();

    Promise.all([loadTiers, loadIAP, loadMemberships, loadActiveTxs]).finally(() => setLoading(false));
  }, [isOpen, creatorId]);

  async function handleSubscribe(tierId: string) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/auth/login'; return; }

    // Find the tier to get its name for IAP product lookup
    const tier = tiers.find(t => t.id === tierId);

    // iOS: use Apple IAP — and NEVER fall through to Stripe from a native build
    // (Guideline 3.1.1). If the tier lookup fails, surface an error, don't Stripe.
    if (useAppleIAP) {
      if (!tier) {
        setError('This tier is unavailable right now. Please try again.');
        return;
      }
      setSubscribing(true);
      setError(null);

      // One live retry if products aren't loaded yet — the sheet may have
      // opened before StoreKit responded, or the initial load failed.
      if (useIAPStore.getState().products.length === 0) {
        await useIAPStore.getState().initialize();
      }
      const products = useIAPStore.getState().products;
      const activeProductIds = activeTxs.map(t => t.productId);
      const mine = myMemberships.find(m => m.creatorId === creatorId);

      let product: ReturnType<typeof iapStore.getProductForTier>;
      if (mine) {
        // Existing membership to THIS creator → plan change. Must purchase in
        // the SAME slot group as the current sub so Apple prorates instead of
        // opening a second subscription.
        const tx = activeTxs.find(t => t.originalTransactionId === mine.providerSubscriptionId);
        const groupIndex = tx ? slotGroupIndexOf(tx.productId) : 0;
        product = productForTierInGroup(products, tier.name, billingInterval, groupIndex)
          || useIAPStore.getState().getProductForTier(tier.name, billingInterval);
      } else {
        // New creator membership → buy into a free slot group.
        product = pickFreeSlotProduct(products, tier.name, billingInterval, activeProductIds);
        if (!product && myMemberships.length > 0) {
          // Every slot taken (or the slot products aren't approved/loaded
          // yet) → offer to move an existing membership instead.
          setSubscribing(false);
          setSwitchFrom(myMemberships.length === 1 ? myMemberships[0] : null);
          setSwitchTarget(tier);
          return;
        }
      }
      if (!product) {
        setSubscribing(false);
        setError(`Couldn't reach the App Store for ${tier.name} pricing. Check your connection and try again.`);
        return;
      }

      try {
        const me = JSON.parse(localStorage.getItem('user') || '{}');
        const result = await iapStore.purchase(product.id, me.id || '', creatorId, tierId);

        if (result === 'success') {
          onClose();
          window.location.reload();
        } else if (result === 'cancelled') {
          // User cancelled — do nothing
        } else if (result === 'pending') {
          setError('Purchase is pending approval. You\'ll get access once approved.');
        } else {
          // Surface the underlying failure so it's diagnosable (App Review
          // reports "an error message" — a bare generic tells us nothing).
          const detail = useIAPStore.getState().error;
          setError(detail ? `Purchase failed: ${detail}` : 'Purchase failed. Please try again.');
        }
      } catch (err: any) {
        setError(err.message || 'Purchase failed');
      } finally {
        setSubscribing(false);
      }
      return;
    }

    // Web: use Stripe
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
    // On iOS an upgrade is just a StoreKit purchase of the new product — Apple
    // handles subscription-group proration. NEVER call the Stripe upgrade
    // endpoint from a native build (Guideline 3.1.1; also 500s for Apple subs).
    if (useAppleIAP) {
      return handleSubscribe(tierId);
    }
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

  async function handleConfirmSwitch() {
    if (!switchTarget || !switchFrom) return;
    const sameTier = switchTarget.name === switchFrom.tierName;
    setSwitching(true);
    setError(null);
    try {
      if (sameTier) {
        // Same tier, new creator: no StoreKit purchase needed — the Apple
        // subscription is unchanged, the server just re-points which creator
        // it supports.
        await apiFetch('/api/fan-subscriptions/switch-creator', {
          method: 'POST',
          body: JSON.stringify({ creatorId, fromCreatorId: switchFrom.creatorId }),
        });
      } else {
        // Different tier: StoreKit plan-change purchase (Apple prorates), then
        // re-point the membership (idempotent with the webhook/restore paths).
        // The purchase must happen INSIDE the from-membership's slot group —
        // any other group would open a second subscription instead.
        const tx = activeTxs.find(t => t.originalTransactionId === switchFrom.providerSubscriptionId);
        const groupIndex = tx ? slotGroupIndexOf(tx.productId) : 0;
        let product = productForTierInGroup(iapStore.products, switchTarget.name, billingInterval, groupIndex);
        if (!product) {
          await useIAPStore.getState().initialize();
          product = productForTierInGroup(useIAPStore.getState().products, switchTarget.name, billingInterval, groupIndex)
            || useIAPStore.getState().getProductForTier(switchTarget.name, billingInterval);
        }
        if (!product) throw new Error("Couldn't reach the App Store. Check your connection and try again.");
        const me = JSON.parse(localStorage.getItem('user') || '{}');
        const result = await iapStore.purchase(product.id, me.id || '', creatorId, switchTarget.id);
        if (result === 'cancelled') {
          setSwitching(false);
          setSwitchTarget(null);
          setSwitchFrom(null);
          return;
        }
        if (result !== 'success') {
          const detail = useIAPStore.getState().error;
          throw new Error(detail ? `Purchase failed: ${detail}` : 'Purchase failed. Please try again.');
        }
        try {
          await apiFetch('/api/fan-subscriptions/switch-creator', {
            method: 'POST',
            body: JSON.stringify({ creatorId, tierName: switchTarget.name, fromCreatorId: switchFrom.creatorId }),
          });
        } catch {
          // webhook/restore also re-point — non-fatal
        }
      }
      setSwitchTarget(null);
      setSwitchFrom(null);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Switch failed. Please try again.');
      setSwitchTarget(null);
      setSwitchFrom(null);
    } finally {
      setSwitching(false);
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
      if (useAppleIAP) {
        // iOS: restore via StoreKit 2 then sync to backend
        const count = await iapStore.restore(creatorId);
        if (count > 0) {
          setRestoreResult(`Restored ${count} subscription(s)`);
          setTimeout(() => { onClose(); window.location.reload(); }, 1500);
        } else {
          setRestoreResult('No purchases found to restore');
        }
      } else {
        // Web fallback
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-[28px] celebration-canvas grain border-t border-white/10 shadow-couture"
          >
            {/* Multicolor hairline crest along the sheet's top edge */}
            <div className="absolute top-0 left-0 right-0 h-px gradient-celebration opacity-60 pointer-events-none" />
            {/* Ambient paywall glow — pure CSS, no WebGL under an open sheet */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-56 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-10 right-0 w-48 h-48 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-24 left-0 w-40 h-40 bg-accent-cyan/[0.08] rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="relative px-5 pb-8 safe-area-pb md:max-w-2xl md:mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="min-w-0 animate-rise opacity-0">
                  <h2 className="text-2xl font-extrabold tracking-tight leading-[1.05] text-white">
                    {isSubscribed ? (
                      <>Manage your membership</>
                    ) : (
                      <>Get closer to <span className="text-celebration">{creatorName}</span></>
                    )}
                  </h2>
                  <p className="text-white/45 text-xs mt-1.5">
                    {isSubscribed ? `Subscribed to ${creatorName}` : 'Pick the membership that fits you'}
                  </p>
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

              {/* Security / provider badge */}
              <div className="flex items-center gap-1.5 mb-5 text-emerald-400/60 text-[11px]">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure payment. Cancel anytime.</span>
              </div>

              {/* All membership slots in use (iOS) — a tier tap will offer a switch */}
              {useAppleIAP && myMemberships.length > 0
                && !myMemberships.some(m => m.creatorId === creatorId)
                && !pickFreeSlotProduct(iapStore.products, 'SUPPORTER', 'month', activeTxs.map(t => t.productId)) && (
                <div className="mb-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <p className="text-white/60 text-xs leading-relaxed">
                    {myMemberships.length === 1 ? (
                      <>
                        Your membership currently supports{' '}
                        <span className="text-white font-semibold">{myMemberships[0].creatorName}</span>.
                        Choosing a tier here switches it to {creatorName}.
                      </>
                    ) : (
                      <>
                        All {myMemberships.length} of your memberships are in use.
                        Choosing a tier here lets you move one to {creatorName}.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-live/10 border border-live/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-live mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-live text-xs font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-live/60 text-[11px] mt-1 underline min-h-[24px]">Dismiss</button>
                  </div>
                </div>
              )}

              {/* Active subscription status */}
              {isSubscribed && (
                <div className="mb-4 p-3.5 rounded-2xl glass-couture">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-accent-green text-xs font-bold tracking-wide">
                      {isCanceling ? 'Canceling at period end' : 'Active subscription'}
                    </span>
                    {currentSubProvider === 'APPLE_IAP' && (
                      <span className="text-white/35 text-[11px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10">via Apple</span>
                    )}
                  </div>
                  {currentSubPeriodEnd && (
                    <p className="text-white/40 text-[11px]">
                      {isCanceling ? 'Access until' : 'Renews'}: {new Date(currentSubPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}

              {loading ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                  <p className="text-white/25 text-[11px] tracking-[0.2em] uppercase">Loading memberships</p>
                </div>
              ) : tiers.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/30 text-sm">This creator hasn&apos;t set up memberships yet.</p>
                </div>
              ) : (
                <>
                  {/* Monthly / Yearly toggle */}
                  {tiers.some(t => t.yearlyPriceCents) && (
                    <div className="flex items-center gap-1 mb-5 p-1 rounded-full glass-couture !rounded-full">
                      <button
                        onClick={() => setBillingInterval('month')}
                        className={`flex-1 min-h-[44px] py-2.5 rounded-full text-xs font-bold transition-all ${
                          billingInterval === 'month'
                            ? 'bg-white/[0.09] text-white border border-white/20'
                            : 'text-white/35 border border-transparent'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingInterval('year')}
                        className={`flex-1 min-h-[44px] py-2.5 rounded-full text-xs font-bold transition-all ${
                          billingInterval === 'year'
                            ? 'bg-white/[0.09] text-white border border-white/20'
                            : 'text-white/35 border border-transparent'
                        }`}
                      >
                        Yearly <span className="text-emerald-400 text-[11px]">Save up to 17%</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {tiers.map(tier => {
                      // On iOS, show Apple IAP pricing if available
                      const iapProduct = useAppleIAP
                        ? iapStore.getProductForTier(tier.name, billingInterval)
                        : undefined;

                      return (
                        <CreatorTierCard
                          key={tier.id}
                          tier={{
                            ...tier,
                            // Override price with Apple IAP price when available
                            ...(iapProduct ? {
                              priceCents: Math.round(iapProduct.price * 100),
                              displayPrice: iapProduct.displayPrice,
                            } : {}),
                            // Show yearly price if in yearly mode
                            ...(billingInterval === 'year' && tier.yearlyPriceCents ? {
                              priceCents: tier.yearlyPriceCents,
                            } : {}),
                          }}
                          isCurrentTier={tier.id === currentTierId}
                          onSubscribe={handleSubscribe}
                          onUpgrade={currentTierId ? handleUpgrade : undefined}
                          disabled={subscribing || iapStore.purchasing}
                        />
                      );
                    })}
                  </div>

                  {/* ─── Subscription Terms (Apple Guideline 3.1.2) ─── */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-white/40 text-[11px] leading-relaxed">
                      {useAppleIAP
                        ? `Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews ${billingInterval === 'year' ? 'yearly' : 'monthly'} unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your Apple ID Settings → Subscriptions after purchase. No refunds for partial billing periods.`
                        : `Subscriptions auto-renew ${billingInterval === 'year' ? 'yearly' : 'monthly'} at the price shown unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. Manage or cancel in your account settings. No refunds for partial billing periods.`}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <a href="/terms" className="text-white/40 underline">Terms of Use (EULA)</a>
                      <a href="/privacy" className="text-white/40 underline">Privacy Policy</a>
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
                  className="w-full mt-4 min-h-[44px] py-3 rounded-full bg-white/[0.03] border border-white/[0.07] text-white/40 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {canceling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Cancel Subscription
                </motion.button>
              )}

              {/* Apple IAP note for cancel */}
              {isSubscribed && currentSubProvider === 'APPLE_IAP' && (
                <p className="mt-2 text-white/20 text-[11px] text-center">
                  To cancel an Apple subscription, go to Settings → Apple ID → Subscriptions
                </p>
              )}

              {/* ─── Restore Purchases ─── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRestore}
                disabled={restoring}
                className="w-full mt-3 min-h-[44px] py-3 rounded-full bg-white/[0.02] text-white/30 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Restore Purchases
              </motion.button>

              {restoreResult && (
                <p className="mt-1 text-center text-emerald-400/60 text-[11px]">{restoreResult}</p>
              )}
            </div>
          </motion.div>

          {/* Membership switch confirmation */}
          <AnimatePresence>
            {switchTarget && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  className="w-full max-w-sm rounded-3xl celebration-canvas grain border border-white/10 p-5 shadow-couture"
                >
                  <h3 className="text-white font-extrabold text-lg mb-2">Switch your membership?</h3>
                  {myMemberships.length > 1 && (
                    <div className="mb-3 space-y-1.5">
                      <p className="text-white/40 text-xs">Choose which membership to move:</p>
                      {myMemberships.map(m => (
                        <button
                          key={m.creatorId}
                          onClick={() => setSwitchFrom(m)}
                          disabled={switching}
                          className={`w-full min-h-[44px] px-3.5 rounded-2xl border text-left text-sm font-medium transition-all ${
                            switchFrom?.creatorId === m.creatorId
                              ? 'bg-white/[0.09] border-white/25 text-white'
                              : 'bg-white/[0.03] border-white/10 text-white/50'
                          }`}
                        >
                          {m.creatorName} <span className="text-white/35 text-xs">· {m.tierName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {switchFrom ? (
                    <p className="text-white/60 text-sm leading-relaxed">
                      {switchTarget.name === switchFrom.tierName ? (
                        <>
                          Your membership currently supports{' '}
                          <span className="text-white font-semibold">{switchFrom.creatorName}</span>.
                          Switch it to <span className="text-white font-semibold">{creatorName}</span>?
                          Your billing stays exactly the same — you won&apos;t be charged again.
                        </>
                      ) : (
                        <>
                          Your membership currently supports{' '}
                          <span className="text-white font-semibold">{switchFrom.creatorName}</span>.
                          Switch to <span className="text-white font-semibold">{creatorName}</span> and
                          change your plan? Apple will adjust your billing automatically.
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-white/60 text-sm leading-relaxed">
                      Pick which membership to move to{' '}
                      <span className="text-white font-semibold">{creatorName}</span>.
                    </p>
                  )}
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => { setSwitchTarget(null); setSwitchFrom(null); }}
                      disabled={switching}
                      className="flex-1 min-h-[44px] rounded-full bg-white/[0.06] border border-white/10 text-white/60 text-sm font-medium disabled:opacity-50"
                    >
                      Keep current
                    </button>
                    <button
                      onClick={handleConfirmSwitch}
                      disabled={switching || !switchFrom}
                      className="flex-1 min-h-[44px] rounded-full gradient-celebration text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {switching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Switch
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
