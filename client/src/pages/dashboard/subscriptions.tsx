import Head from 'next/head';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { apiFetch } from '@/utils/api';
import {
  Crown, Star, Sparkles, Users, TrendingUp, DollarSign, Loader2,
  Settings, ChevronRight, ArrowLeft, BarChart3, UserCheck, UserMinus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const TIER_CONFIG: Record<string, { icon: any; color: string; gradient: string; label: string }> = {
  SUPPORTER: { icon: Star, color: 'text-brand-400', gradient: 'from-brand-500/20 to-pink-500/10', label: 'Supporter' },
  VIP: { icon: Crown, color: 'text-violet-400', gradient: 'from-violet-500/20 to-purple-500/10', label: 'VIP' },
  INNER_CIRCLE: { icon: Sparkles, color: 'text-amber-400', gradient: 'from-amber-500/20 to-orange-500/10', label: 'Inner Circle' },
};

export default function SubscriptionDashboard() {
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/creator-tiers/me/all');
      setTiers(data.tiers || []);
      setMrr(data.mrr || 0);
    } catch {
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
      alert(err.message || 'Failed to initialize tiers');
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
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Subscriptions - Creator Dashboard</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-4">
        {/* Back nav */}
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-white/40 text-xs mb-4 hover:text-white/60 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </button>

        <h1 className="text-white text-xl font-extrabold mb-1">Subscription Management</h1>
        <p className="text-white/40 text-xs mb-5">Manage your fan tiers and track recurring revenue</p>

        {tiers.length === 0 ? (
          /* No tiers yet — initialization flow */
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-white text-lg font-bold mb-2">Set Up Fan Subscriptions</h2>
            <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
              Create 3 subscription tiers so your fans can support you monthly and unlock premium access.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={initializeTiers}
              disabled={initializing}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-brand-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
            >
              {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Initialize Tiers
            </motion.button>
          </div>
        ) : (
          <>
            {/* ─── Overview Stats ─── */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <StatCard
                icon={Users}
                label="Subscribers"
                value={String(totalSubscribers)}
                color="text-violet-400"
                bg="bg-violet-500/10"
              />
              <StatCard
                icon={DollarSign}
                label="MRR"
                value={`$${(mrr / 100).toFixed(0)}`}
                color="text-emerald-400"
                bg="bg-emerald-500/10"
              />
              <StatCard
                icon={UserMinus}
                label="Churned"
                value={String(totalCanceled)}
                color="text-red-400"
                bg="bg-red-500/10"
              />
            </div>

            {/* ─── Tier Cards ─── */}
            <div className="space-y-3 mb-6">
              {tiers.map(tier => {
                const config = TIER_CONFIG[tier.name] || TIER_CONFIG.SUPPORTER;
                const Icon = config.icon;
                const price = (tier.priceCents / 100).toFixed(2);
                const tierMrr = (tier.activeSubscribers || 0) * tier.priceCents;

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 p-4`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="text-white text-sm font-bold">{config.label}</h3>
                          <p className="text-white/40 text-[10px]">${price}/month</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-bold">{tier.activeSubscribers || 0}</p>
                        <p className="text-white/30 text-[10px]">active</p>
                      </div>
                    </div>

                    {/* Revenue from this tier */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.05]">
                      <span className="text-white/40 text-[10px]">Monthly revenue</span>
                      <span className="text-emerald-400 text-xs font-bold">${(tierMrr / 100).toFixed(2)}</span>
                    </div>

                    {/* Slot limit for Inner Circle */}
                    {tier.slotLimit && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
                        <Users className="w-3 h-3" />
                        {tier.activeSubscribers || 0} / {tier.slotLimit} spots
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ─── Quick Actions ─── */}
            <div className="space-y-2">
              <h3 className="text-white/30 text-[10px] uppercase tracking-wider font-bold mb-2">Actions</h3>
              <ActionRow icon={Settings} label="Edit Tier Pricing" desc="Adjust prices and benefits" onClick={() => {}} />
              <ActionRow icon={BarChart3} label="Subscription Analytics" desc="Churn rate, upgrade funnels" onClick={() => {}} />
              <ActionRow icon={UserCheck} label="View Subscribers" desc="See all active fans" onClick={() => {}} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl ${bg} border border-white/5 p-3 text-center`}>
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <p className="text-white text-lg font-extrabold">{value}</p>
      <p className="text-white/30 text-[9px] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function ActionRow({ icon: Icon, label, desc, onClick }: {
  icon: any; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold">{label}</p>
        <p className="text-white/30 text-[10px]">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
    </button>
  );
}
