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
    { label: 'Total Users', value: stats.userCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Creators', value: stats.creatorCount, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'Total Streams', value: stats.streamCount, icon: Radio, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Live Now', value: stats.liveStreams, icon: Radio, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Total Reports', value: stats.reportCount, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <>
      <Head><title>Admin Dashboard - Be With Me</title></Head>
      <div className="min-h-screen bg-surface-dark">
        {/* Header */}
        <div className="sticky top-0 z-50 glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-500" />
              <h1 className="font-display text-lg font-bold text-white">Admin Panel</h1>
            </div>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to App
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface-card rounded-2xl border border-white/5 p-5"
              >
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Nav */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/admin/reports">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-surface-card rounded-2xl border border-white/5 p-6 hover:border-brand-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Report Queue</h2>
                  {stats.pendingReports > 0 && (
                    <span className="ml-auto bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {stats.pendingReports} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Review and resolve user reports</p>
              </motion.div>
            </Link>

            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-surface-card rounded-2xl border border-white/5 p-6 hover:border-brand-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">User Management</h2>
                </div>
                <p className="text-sm text-gray-500">Search users, manage roles, moderate accounts</p>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
