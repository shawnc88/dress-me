import Head from 'next/head';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { apiFetch } from '@/utils/api';
import {
  Crown, Star, Sparkles, Users, TrendingUp, DollarSign, Loader2,
  Settings, ChevronRight, ArrowLeft, BarChart3, UserCheck, UserMinus,
  X, Save, Edit3,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';

/**
 * Universal tier voices — hues match the Live Effects catalog:
 *  - SUPPORTER    → cyan (fresh, welcoming)
 *  - VIP          → violet (premium depth)
 *  - INNER_CIRCLE → amber (top-tier spotlight)
 */
const TIER_CONFIG: Record<string, { icon: any; color: string; gradient: string; label: string; frame: string; badge: string; glow: string; elite: boolean }> = {
  SUPPORTER: {
    icon: Star,
    color: 'text-accent-cyan',
    gradient: 'from-accent-cyan/[0.10] via-transparent to-transparent',
    frame: 'border border-accent-cyan/25 shadow-glow-cyan',
    badge: 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25',
    glow: 'bg-accent-cyan/15',
    label: 'Supporter',
    elite: false,
  },
  VIP: {
    icon: Crown,
    color: 'text-accent-violet',
    gradient: 'from-accent-violet/[0.12] via-transparent to-transparent',
    frame: 'border border-accent-violet/30 shadow-glow-violet',
    badge: 'bg-accent-violet/15 text-accent-violet border border-accent-violet/30',
    glow: 'bg-accent-violet/15',
    label: 'VIP',
    elite: false,
  },
  INNER_CIRCLE: {
    icon: Sparkles,
    color: 'text-accent-amber',
    gradient: 'from-accent-amber/[0.12] via-transparent to-transparent',
    frame: 'border border-accent-amber/30 shadow-glow-amber',
    badge: 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30',
    glow: 'bg-accent-amber/15',
    label: 'Inner Circle',
    elite: true,
  },
};

export default function SubscriptionDashboard() {
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEditPricing, setShowEditPricing] = useState(false);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch('/api/creator-tiers/me/all');
      setTiers(data.tiers || []);
      setMrr(data.mrr || 0);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setLoadError('Your account is not marked as a creator yet. Finish the creator onboarding first.');
      } else if (err?.statusCode === 404) {
        setLoadError('Creator profile not found. Complete onboarding to continue.');
      } else {
        setLoadError(err?.message || 'Failed to load subscription data.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function initializeTiers() {
    setInitializing(true);
    try {
      await apiFetch('/api/creator-tiers', { method: 'POST' });
      await loadData();
    } catch (err: any) {
      if (err?.statusCode === 403) {
        alert('Your account is not a creator. Please complete creator onboarding first, then come back.');
        router.push('/become-creator');
      } else {
        alert(err?.message || 'Failed to initialize tiers');
      }
    } finally {
      setInitializing(false);
    }
  }

  const totalSubscribers = tiers.reduce((sum, t) => sum + (t.activeSubscribers || 0), 0);
  const totalCanceled = tiers.reduce((sum, t) => sum + (t.canceledSubscribers || 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {/* Breathing multicolor orb — no bare spinner */}
          <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Your People - Creator Dashboard</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-4 pb-24 safe-area-pb">
        {/* Back nav */}
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-white/40 text-xs mb-3 min-h-[44px] pr-3 -ml-1 pl-1 hover:text-white/70 transition-colors no-select">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </button>

        {/* ─── Celebration header — slim, universal voice ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 px-5 pt-5 pb-4 mb-5" style={{ animationDelay: '4s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-cyan/50 via-accent-violet/50 to-accent-amber/50"
            aria-hidden
          />
          <div className="relative z-[2] animate-rise">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-1">
              Subscribers
            </p>
            <h1 className="text-white text-2xl font-extrabold tracking-tight leading-[1.05]">
              Your <span className="text-celebration">people</span>
            </h1>
            <p className="text-white/40 text-xs mt-1">Manage your tiers and watch monthly support grow</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-5 p-4 rounded-2xl bg-accent-amber/10 backdrop-blur-xl border border-accent-amber/25">
            <p className="text-accent-amber text-xs font-medium">{loadError}</p>
            {loadError.includes('creator') && (
              <button
                onClick={() => router.push('/become-creator')}
                className="mt-1 text-accent-amber/80 text-[11px] underline min-h-[44px] pr-3"
              >
                Go to creator onboarding
              </button>
            )}
          </div>
        )}

        {tiers.length === 0 && !loadError ? (
          /* No tiers yet — initialization flow */
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] text-center py-12 px-5 animate-rise">
            <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-accent-violet/15 rounded-full blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl" aria-hidden />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-brand-500/20 border border-accent-violet/25 shadow-glow-violet flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-accent-violet" />
              </div>
              <h2 className="text-white text-lg font-extrabold tracking-tight mb-2">Open your tiers</h2>
              <p className="text-white/45 text-sm mb-6 max-w-xs mx-auto">
                Create 3 subscription tiers so your people can back you monthly and unlock more of you.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={initializeTiers}
                disabled={initializing}
                className="glimmer px-8 py-3 min-h-[48px] rounded-full overflow-hidden bg-gradient-to-r from-accent-violet to-brand-500 text-white text-sm font-bold shadow-glow-violet disabled:opacity-50 flex items-center justify-center gap-2 mx-auto no-select"
              >
                {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create Your Tiers
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Overview Stats — glass, multi-accent ─── */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <StatCard
                icon={Users}
                label="Your People"
                value={String(totalSubscribers)}
                color="text-accent-violet"
                bg="bg-accent-violet/10"
                delay={0}
              />
              <StatCard
                icon={DollarSign}
                label="MRR"
                value={`$${(mrr / 100).toFixed(0)}`}
                color="text-accent-green"
                bg="bg-accent-green/10"
                delay={60}
              />
              <StatCard
                icon={UserMinus}
                label="Churned"
                value={String(totalCanceled)}
                color="text-live"
                bg="bg-live/10"
                delay={120}
              />
            </div>

            {/* ─── Tier Cards — premium glass in each tier's hue ─── */}
            <div className="space-y-3 mb-6">
              {tiers.map((tier, i) => {
                const config = TIER_CONFIG[tier.name] || TIER_CONFIG.SUPPORTER;
                const Icon = config.icon;
                const price = (tier.priceCents / 100).toFixed(2);
                const tierMrr = (tier.activeSubscribers || 0) * tier.priceCents;

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`glimmer relative overflow-hidden rounded-3xl bg-white/[0.04] backdrop-blur-xl ${config.frame} p-4`}
                  >
                    {/* Tier aura wash + soft corner glow — decorative only */}
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${config.gradient}`} aria-hidden />
                    <div className={`pointer-events-none absolute -top-10 -right-10 w-32 h-32 ${config.glow} rounded-full blur-3xl`} aria-hidden />
                    {config.elite && (
                      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/70 to-transparent" aria-hidden />
                    )}

                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-2xl ${config.badge} flex items-center justify-center`}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-extrabold tracking-tight ${config.elite ? 'text-accent-amber' : 'text-white'}`}>{config.label}</h3>
                            <p className="text-white/40 text-[10px]">${price}/month</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-extrabold tracking-tight leading-none ${config.color}`}>{tier.activeSubscribers || 0}</p>
                          <p className="text-white/30 text-[10px] mt-0.5 uppercase tracking-wider">active</p>
                        </div>
                      </div>

                      {/* Revenue from this tier */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-white/40 text-[10px] uppercase tracking-wider">Monthly revenue</span>
                        <span className="text-accent-green text-xs font-bold">${(tierMrr / 100).toFixed(2)}</span>
                      </div>

                      {/* Slot limit for Inner Circle */}
                      {tier.slotLimit && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/40">
                          <Users className={`w-3 h-3 ${config.color}`} />
                          {tier.activeSubscribers || 0} / {tier.slotLimit} spots
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ─── Quick Actions ─── */}
            <div className="space-y-2 animate-rise">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-violet/80 mb-2">Keep it growing</p>
              <ActionRow icon={Settings} label="Edit Tier Pricing" desc="Adjust prices and benefits" onClick={() => setShowEditPricing(!showEditPricing)} />
              <ActionRow icon={BarChart3} label="Subscription Analytics" desc="Churn rate, upgrade funnels" onClick={() => router.push('/dashboard/analytics')} />
              <ActionRow icon={UserCheck} label="See Your People" desc="Everyone backing you right now" onClick={async () => {
                if (showSubscribers) { setShowSubscribers(false); return; }
                try {
                  const creatorId = tiers[0]?.creatorId;
                  if (!creatorId) return;
                  const data = await apiFetch(`/api/fan-subscriptions/creator/${creatorId}/subscribers`);
                  setSubscribers(data.subscribers || []);
                  setShowSubscribers(true);
                } catch {}
              }} />
            </div>

            {/* ─── Edit Tier Pricing ─── */}
            {showEditPricing && (
              <div className="mt-4 space-y-2 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]">
                <h4 className="text-white text-xs font-extrabold tracking-tight mb-2">Edit Pricing</h4>
                {tiers.map(tier => {
                  const config = TIER_CONFIG[tier.name] || TIER_CONFIG.SUPPORTER;
                  const isEditing = editingTier?.id === tier.id;
                  return (
                    <div key={tier.id} className="flex items-center justify-between p-2 min-h-[52px] rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="w-20 px-2 min-h-[44px] rounded-xl bg-white/10 text-white text-xs border border-white/10 focus:border-accent-violet/50 outline-none"
                          />
                          <button
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await apiFetch(`/api/creator-tiers/${tier.id}`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ priceCents: Math.round(parseFloat(editPrice) * 100) }),
                                });
                                setEditingTier(null);
                                await loadData();
                              } catch (err: any) { alert(err.message); }
                              finally { setSaving(false); }
                            }}
                            className="px-3 min-h-[44px] rounded-xl bg-accent-green/15 border border-accent-green/25 text-accent-green text-[10px] font-bold no-select"
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingTier(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-xs">${(tier.priceCents / 100).toFixed(2)}/mo</span>
                          <button
                            onClick={() => { setEditingTier(tier); setEditPrice((tier.priceCents / 100).toFixed(2)); }}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/70 transition-colors no-select"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Subscribers List ─── */}
            {showSubscribers && (
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]">
                <h4 className="text-white text-xs font-extrabold tracking-tight mb-3">Your People ({subscribers.length})</h4>
                {subscribers.length === 0 ? (
                  <p className="text-white/35 text-xs">No one here yet — go live and invite them in</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {subscribers.map((sub: any) => (
                      <div key={sub.id} className="flex items-center gap-3 p-2 min-h-[52px] rounded-xl bg-white/[0.03] border border-white/[0.04]">
                        <div className="w-9 h-9 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden flex-shrink-0">
                          {sub.user?.avatarUrl ? (
                            <img src={sub.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                              {(sub.user?.displayName || '?').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{sub.user?.displayName}</p>
                          <p className="text-white/30 text-[10px]">@{sub.user?.username}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          TIER_CONFIG[sub.tier?.name]?.color || 'text-white/40'
                        } bg-white/5 border border-white/[0.06]`}>
                          {sub.tier?.name?.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, delay = 0 }: {
  icon: any; label: string; value: string; color: string; bg: string; delay?: number;
}) {
  return (
    <div
      className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-3 text-center animate-rise opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mx-auto mb-1.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-white text-lg font-extrabold tracking-tight">{value}</p>
      <p className="text-white/30 text-[9px] uppercase tracking-[0.16em]">{label}</p>
    </div>
  );
}

function ActionRow({ icon: Icon, label, desc, onClick }: {
  icon: any; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 min-h-[56px] rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] transition-colors text-left no-select"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold">{label}</p>
        <p className="text-white/30 text-[10px]">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
    </button>
  );
}
