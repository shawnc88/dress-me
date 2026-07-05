import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { LiveStreamMetrics } from '@/components/ui/LiveStreamMetrics';
import { CreatorEarningsCard } from '@/components/ui/CreatorEarningsCard';
import { CreatorPlaybookCard } from '@/components/creator/CreatorPlaybookCard';
import {
  Radio, Eye, Heart, MessageCircle, DollarSign, TrendingUp, Zap,
  ChevronRight, BarChart3, UserPen, Settings, Gift, Tv, Sparkles,
  CalendarPlus, Users, BookOpen,
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

      // Redirect non-creators to become-creator page
      if (userData.user.role !== 'CREATOR' && userData.user.role !== 'ADMIN') {
        router.push('/become-creator');
        return;
      }

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
          {/* Breathing multicolor orb — no bare spinner */}
          <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-white/45 text-sm">{error || 'Something went wrong'}</p>
        </div>
      </Layout>
    );
  }

  const isCreator = data.user.role === 'CREATOR' || data.user.role === 'ADMIN';

  return (
    <Layout>
      <Head><title>Your Dashboard - Be With Me</title></Head>

      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        {/* ─── Celebration hero header — CSS color, no ambient 3D ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-5 pt-6 pb-5" style={{ animationDelay: '0s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-brand-500/50 via-accent-violet/50 to-accent-cyan/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 animate-rise min-w-0">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-brand-500/10 ring-1 ring-brand-500/40 shadow-glow-sm flex-shrink-0">
                {data.user.avatarUrl ? (
                  <img src={data.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-brand-400">
                    {data.user.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-1">
                  Hey, {data.user.displayName}
                </p>
                <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                  Your <span className="text-celebration">dashboard</span>
                </h1>
                <p className="text-xs text-white/40 mt-0.5 truncate">@{data.user.username}</p>
              </div>
            </div>
            {isCreator && (
              <Link href="/dashboard/go-live" className="flex-shrink-0">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="glimmer flex items-center gap-2 bg-live hover:brightness-110 text-white text-sm font-bold px-5 h-11 min-h-[44px] rounded-full overflow-hidden shadow-glow-live transition-all no-select"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Go Live
                </motion.div>
              </Link>
            )}
          </div>
        </div>

        {/* ─── Live Status Panel ─── */}
        {data.liveStream && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-live/10 via-brand-500/10 to-accent-violet/10 backdrop-blur-xl rounded-3xl border border-live/25 shadow-glow-live p-5"
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-live/60 via-brand-500/50 to-accent-violet/40"
              aria-hidden
            />
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-live text-white text-xs font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              <span className="text-sm text-white font-semibold">{data.liveStream.title}</span>
            </div>

            <LiveStreamMetrics streamId={data.liveStream.id} />

            <div className="flex gap-3 mt-4">
              <Link
                href={`/stream/${data.liveStream.id}`}
                className="flex-1 min-h-[44px] py-2.5 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold text-center flex items-center justify-center hover:bg-white/15 transition-colors no-select"
              >
                View Stream
              </Link>
              <Link
                href="/dashboard/go-live"
                className="flex-1 min-h-[44px] py-2.5 rounded-full bg-live/15 border border-live/30 text-live text-sm font-semibold text-center flex items-center justify-center hover:bg-live/25 transition-colors no-select"
              >
                Manage
              </Link>
            </div>
          </motion.div>
        )}

        {/* ─── Performance Stats — multi-accent spectrum ─── */}
        {isCreator && (
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { icon: Eye, value: data.stats.totalViewers, label: 'Views', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
              { icon: Tv, value: data.stats.totalStreams, label: 'Streams', color: 'text-brand-400', bg: 'bg-brand-500/10' },
              { icon: Gift, value: data.stats.totalGiftsReceived, label: 'Gifts', color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
              { icon: Users, value: data.stats.avgViewers, label: 'Avg View', color: 'text-accent-green', bg: 'bg-accent-green/10' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glimmer bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/[0.08] p-3 text-center"
              >
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-base font-bold tracking-tight text-white">
                  {stat.value > 999 ? `${(stat.value / 1000).toFixed(1)}K` : stat.value}
                </p>
                <p className="text-[9px] text-white/35 uppercase tracking-[0.16em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* ─── Weekly Playbook Card ─── */}
        {isCreator && <CreatorPlaybookCard />}

        {/* ─── Viewer Stats (non-creator) ─── */}
        {!isCreator && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
              <div className="w-9 h-9 rounded-xl bg-accent-amber/10 flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5 text-accent-amber" />
              </div>
              <p className="text-xl font-bold tracking-tight text-white">{data.user.threadBalance}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.16em]">Thread Balance</p>
            </div>
            <Link href="/become-creator" className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-brand-500/25 shadow-glow-sm p-4 hover:border-brand-500/50 transition-colors no-select">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center mb-2">
                <Radio className="w-5 h-5 text-brand-400" />
              </div>
              <p className="text-sm font-bold text-white">Become a creator</p>
              <p className="text-[10px] text-white/40">Go live, get paid</p>
            </Link>
          </div>
        )}

        {/* ─── Recent Streams ─── */}
        {isCreator && data.recentStreams.length > 0 && (
          <div className="animate-rise">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-1">
                  Replay the party
                </p>
                <h2 className="text-lg font-extrabold tracking-tight text-white">Recent streams</h2>
              </div>
              <Link href="/dashboard/analytics" className="text-[11px] text-accent-cyan font-semibold flex items-center gap-0.5 min-h-[44px] px-2 -mr-2 hover:text-accent-cyan/80 transition-colors">
                See all <ChevronRight className="w-3 h-3" />
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
                      className="flex items-center gap-3 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-3.5 min-h-[56px] hover:border-white/20 transition-colors no-select"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                        <Tv className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/40">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3 text-accent-blue/70" />{s.peakViewers}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3 text-accent-cyan/70" />{s._count?.chatMessages || 0}</span>
                          <span className="flex items-center gap-0.5"><Gift className="w-3 h-3 text-accent-amber/70" />{s._count?.gifts || 0}</span>
                          {duration && <span>{duration}m</span>}
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        s.status === 'LIVE' ? 'bg-live/15 text-live' :
                        s.status === 'ENDED' ? 'bg-white/[0.06] text-white/40' :
                        'bg-accent-violet/10 text-accent-violet'
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
          <div className="animate-rise">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-1">
              Money moves
            </p>
            <h2 className="text-lg font-extrabold tracking-tight text-white mb-3">Your earnings</h2>
            <CreatorEarningsCard />
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div className="animate-rise">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-violet/80 mb-1">
            Jump in
          </p>
          <h2 className="text-lg font-extrabold tracking-tight text-white mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {isCreator && (
              <>
                <QuickAction href="/dashboard/go-live" icon={Radio} color="text-live" bg="bg-live/10 border border-live/20" label="Go Live" />
                <QuickAction href="/dashboard/playbook" icon={BookOpen} color="text-accent-amber" bg="bg-accent-amber/10 border border-accent-amber/20" label="Weekly Playbook" />
                <QuickAction href="/dashboard/subscriptions" icon={Users} color="text-accent-violet" bg="bg-accent-violet/10 border border-accent-violet/20" label="Your People" />
                <QuickAction href="/dashboard/analytics" icon={BarChart3} color="text-accent-cyan" bg="bg-accent-cyan/10 border border-accent-cyan/20" label="Analytics" />
              </>
            )}
            <QuickAction href="/streams" icon={Tv} color="text-accent-magenta" bg="bg-accent-magenta/10 border border-accent-magenta/20" label="Discover" />
            <QuickAction href="/profile" icon={UserPen} color="text-accent-green" bg="bg-accent-green/10 border border-accent-green/20" label="Edit Profile" />
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
        className="glimmer bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/[0.08] p-4 min-h-[60px] flex items-center gap-3 hover:border-white/20 transition-colors no-select"
      >
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-sm font-semibold text-white">{label}</span>
      </motion.div>
    </Link>
  );
}
