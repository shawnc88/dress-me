import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Shield, Users, AlertTriangle, Radio, FileText, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface DashboardStats {
  userCount: number;
  creatorCount: number;
  streamCount: number;
  reportCount: number;
  pendingReports: number;
  liveStreams: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      router.replace('/');
      return;
    }
    apiFetch<{ stats: DashboardStats }>('/api/admin/dashboard')
      .then((data) => setStats(data.stats))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats.userCount, icon: Users, accent: 'blue' },
    { label: 'Creators', value: stats.creatorCount, icon: TrendingUp, accent: 'pink' },
    { label: 'Total Streams', value: stats.streamCount, icon: Radio, accent: 'violet' },
    { label: 'Live Now', value: stats.liveStreams, icon: Radio, accent: 'live' },
    { label: 'Total Reports', value: stats.reportCount, icon: FileText, accent: 'amber' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, accent: 'orange' },
  ];

  const accentMap: Record<string, { icon: string; value: string; border: string; hairline: string }> = {
    blue:   { icon: 'text-accent-blue',   value: 'text-accent-blue',   border: 'border-accent-blue/20 hover:border-accent-blue/40',   hairline: 'via-accent-blue/40' },
    pink:   { icon: 'text-brand-500',     value: 'text-brand-500',     border: 'border-brand-500/20 hover:border-brand-500/40',       hairline: 'via-brand-500/40' },
    violet: { icon: 'text-accent-violet', value: 'text-accent-violet', border: 'border-accent-violet/20 hover:border-accent-violet/40', hairline: 'via-accent-violet/40' },
    live:   { icon: 'text-live',          value: 'text-live',          border: 'border-live/20 hover:border-live/40',                 hairline: 'via-live/40' },
    amber:  { icon: 'text-accent-amber',  value: 'text-accent-amber',  border: 'border-accent-amber/20 hover:border-accent-amber/40', hairline: 'via-accent-amber/40' },
    orange: { icon: 'text-accent-orange', value: 'text-accent-orange', border: 'border-accent-orange/20 hover:border-accent-orange/40', hairline: 'via-accent-orange/40' },
  };

  return (
    <>
      <Head><title>Admin Dashboard - Be With Me</title></Head>
      <div className="min-h-screen bg-surface-dark nightfall-canvas">
        {/* Slim admin header */}
        <div className="sticky top-0 z-50 glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-violet" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Admin</p>
              <span className="text-white/15 mx-1">/</span>
              <h1 className="font-bold text-sm text-white">Dashboard</h1>
            </div>
            <Link href="/" className="text-xs text-white/40 hover:text-white/80 transition-colors min-h-[44px] flex items-center">
              Back to App
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Section header */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-accent-violet/70 mb-1">
              Platform overview
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-white">Stats</h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {cards.map((card, i) => {
              const a = accentMap[card.accent] || accentMap.blue;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative glass-card border ${a.border} p-5 transition-all duration-300 overflow-hidden`}
                >
                  <div
                    className={`pointer-events-none absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent ${a.hairline} to-transparent`}
                    aria-hidden
                  />
                  <div className={`w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-3`}>
                    <card.icon className={`w-4 h-4 ${a.icon}`} />
                  </div>
                  <p className={`text-2xl font-extrabold tracking-tight ${a.value}`}>{card.value.toLocaleString()}</p>
                  <p className="text-[11px] font-medium text-white/45 mt-1">{card.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Nav */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35 mb-4">
              Moderation tools
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/admin/reports">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="relative glass-card border border-white/[0.08] hover:border-accent-amber/35 p-6 transition-all duration-300 cursor-pointer overflow-hidden group min-h-[44px]"
              >
                <div
                  className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-amber/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden
                />
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-accent-amber" />
                  <h2 className="text-base font-bold text-white">Report Queue</h2>
                  {stats.pendingReports > 0 && (
                    <span className="ml-auto bg-accent-amber/15 text-accent-amber text-[10px] font-bold px-2 py-0.5 rounded-full border border-accent-amber/20">
                      {stats.pendingReports} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40">Review and resolve user reports</p>
              </motion.div>
            </Link>

            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="relative glass-card border border-white/[0.08] hover:border-accent-blue/35 p-6 transition-all duration-300 cursor-pointer overflow-hidden group min-h-[44px]"
              >
                <div
                  className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-blue/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden
                />
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-accent-blue" />
                  <h2 className="text-base font-bold text-white">User Management</h2>
                </div>
                <p className="text-sm text-white/40">Search users, manage roles, moderate accounts</p>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
