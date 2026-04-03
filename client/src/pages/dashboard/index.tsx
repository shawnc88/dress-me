import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { LiveStreamMetrics } from '@/components/ui/LiveStreamMetrics';
import { CreatorEarningsCard } from '@/components/ui/CreatorEarningsCard';
import {
  Radio, Eye, Heart, MessageCircle, DollarSign, TrendingUp, Zap,
  ChevronRight, BarChart3, UserPen, Settings, Gift, Tv, Sparkles,
  CalendarPlus, Users,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DashboardData {
  user: { id: string; displayName: string; username: string; role: string; threadBalance: number; avatarUrl: string | null };
  creator?: { totalEarnings: number; threadBalance: number; isLive: boolean; streamKey: string };
  stats: { totalStreams: number; totalViewers: number; avgViewers: number; totalGiftsReceived: number };
  liveStream?: { id: string; title: string; viewerCount: number; peakViewers: number; startedAt: string };
  recentStreams: Array<{ id: string; title: string; status: string; peakViewers: number; startedAt: string | null; endedAt: string | null; _count: { chatMessages: number; gifts: number } }>;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    fetchDashboard(token);
  }, [router]);

  async function fetchDashboard(token: string) {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const userRes = await fetch(`${API_URL}/api/auth/me`, { headers });
      if (!userRes.ok) { localStorage.removeItem('token'); router.push('/auth/login'); return; }
      const userData = await userRes.json();

      let creator = null;
      let stats = { totalStreams: 0, totalViewers: 0, avgViewers: 0, totalGiftsReceived: 0 };
      let liveStream = undefined;
      let recentStreams: any[] = [];

      if (userData.user.role === 'CREATOR' || userData.user.role === 'ADMIN') {
        const [creatorRes, dashRes] = await Promise.all([
          fetch(`${API_URL}/api/creators/me`, { headers }),
          fetch(`${API_URL}/api/creators/dashboard`, { headers }),
        ]);

        if (creatorRes.ok) {
          const cd = await creatorRes.json();
          creator = cd.creator;
          stats = cd.stats;
        }

        if (dashRes.ok) {
          const dd = await dashRes.json();
          recentStreams = dd.stats?.recentStreams || [];

          // Find active live stream
          const live = recentStreams.find((s: any) => s.status === 'LIVE');
          if (live) {
            liveStream = { id: live.id, title: live.title, viewerCount: live.viewerCount, peakViewers: live.peakViewers, startedAt: live.startedAt };
          }
        }
      }

      setData({ user: userData.user, creator, stats, liveStream, recentStreams });
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-500">{error || 'Something went wrong'}</p>
        </div>
      </Layout>
    );
  }

  const isCreator = data.user.role === 'CREATOR' || data.user.role === 'ADMIN';

  return (
    <Layout>
      <Head><title>Dashboard - Dress Me</title></Head>

      <div className="max-w-[630px] mx-auto px-4 py-6 space-y-6">
        {/* ─── Welcome Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-500/10 flex-shrink-0">
              {data.user.avatarUrl ? (
                <img src={data.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-400">
                  {data.user.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Hey, {data.user.displayName}</h1>
              <p className="text-xs text-gray-500">@{data.user.username}</p>
            </div>
          </div>
          {isCreator && (
            <Link href="/dashboard/go-live">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 gradient-premium text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-glow"
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Go Live
              </motion.div>
            </Link>
          )}
        </div>

        {/* ─── Live Status Panel ─── */}
        {data.liveStream && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-500/10 via-brand-500/10 to-violet-500/10 rounded-2xl border border-red-500/20 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              <span className="text-sm text-white font-semibold">{data.liveStream.title}</span>
            </div>

            <LiveStreamMetrics streamId={data.liveStream.id} />

            <div className="flex gap-3 mt-4">
              <Link
                href={`/stream/${data.liveStream.id}`}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold text-center hover:bg-white/15 transition-colors"
              >
                View Stream
              </Link>
              <Link
                href="/dashboard/go-live"
                className="flex-1 py-2.5 rounded-xl bg-red-600/20 text-red-400 text-sm font-semibold text-center hover:bg-red-600/30 transition-colors"
              >
                Manage
              </Link>
            </div>
          </motion.div>
        )}

        {/* ─── Performance Stats ─── */}
        {isCreator && (
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { icon: Eye, value: data.stats.totalViewers, label: 'Views', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: Tv, value: data.stats.totalStreams, label: 'Streams', color: 'text-brand-500', bg: 'bg-brand-500/10' },
              { icon: Gift, value: data.stats.totalGiftsReceived, label: 'Gifts', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: Users, value: data.stats.avgViewers, label: 'Avg View', color: 'text-green-400', bg: 'bg-green-500/10' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface-card rounded-2xl border border-white/5 p-3 text-center"
              >
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-base font-bold text-white">
                  {stat.value > 999 ? `${(stat.value / 1000).toFixed(1)}K` : stat.value}
                </p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* ─── Viewer Stats (non-creator) ─── */}
        {!isCreator && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-card rounded-2xl border border-white/5 p-4">
              <Sparkles className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-xl font-bold text-white">{data.user.threadBalance}</p>
              <p className="text-[10px] text-gray-500 uppercase">Thread Balance</p>
            </div>
            <Link href="/become-creator" className="bg-surface-card rounded-2xl border border-brand-500/20 p-4 hover:border-brand-500/40 transition-colors">
              <Radio className="w-5 h-5 text-brand-500 mb-2" />
              <p className="text-sm font-bold text-white">Become a Creator</p>
              <p className="text-[10px] text-gray-500">Start streaming today</p>
            </Link>
          </div>
        )}

        {/* ─── Recent Streams ─── */}
        {isCreator && data.recentStreams.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Recent Streams</h2>
              <Link href="/dashboard/analytics" className="text-[10px] text-brand-500 font-semibold flex items-center gap-0.5">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {data.recentStreams.slice(0, 5).map((s, i) => {
                const duration = s.startedAt && s.endedAt
                  ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
                  : null;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/stream/${s.id}`}
                      className="flex items-center gap-3 bg-surface-card rounded-2xl border border-white/5 p-3.5 hover:border-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <Tv className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{s.peakViewers}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{s._count?.chatMessages || 0}</span>
                          <span className="flex items-center gap-0.5"><Gift className="w-3 h-3" />{s._count?.gifts || 0}</span>
                          {duration && <span>{duration}m</span>}
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        s.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                        s.status === 'ENDED' ? 'bg-gray-500/10 text-gray-500' :
                        'bg-violet-500/10 text-violet-400'
                      }`}>{s.status}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Earnings ─── */}
        {isCreator && (
          <div>
            <h2 className="text-sm font-bold text-white mb-3">Earnings</h2>
            <CreatorEarningsCard />
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {isCreator && (
              <>
                <QuickAction href="/dashboard/go-live" icon={Radio} color="text-red-400" bg="bg-red-500/10" label="Go Live" />
                <QuickAction href="/dashboard/analytics" icon={BarChart3} color="text-blue-400" bg="bg-blue-500/10" label="Analytics" />
              </>
            )}
            <QuickAction href="/streams" icon={Tv} color="text-brand-500" bg="bg-brand-500/10" label="Discover" />
            <QuickAction href="/profile" icon={UserPen} color="text-green-400" bg="bg-green-500/10" label="Edit Profile" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function QuickAction({ href, icon: Icon, color, bg, label }: { href: string; icon: any; color: string; bg: string; label: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="bg-surface-card rounded-2xl border border-white/5 p-4 flex items-center gap-3 hover:border-white/10 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-sm font-semibold text-white">{label}</span>
      </motion.div>
    </Link>
  );
}
