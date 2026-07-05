import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { Eye, DollarSign, Clock, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AnalyticsData {
  summary: {
    totalStreams: number;
    periodStreams: number;
    totalViewers: number;
    avgViewers: number;
    totalChatMessages: number;
    totalGifts: number;
    threadBalance: number;
    earningsUsd: string;
    avgDurationMin: number;
  };
  viewerTrend: Array<{ date: string; viewers: number; streams: number }>;
  giftsByType: Array<{ type: string; threads: number; count: number }>;
  topStreams: Array<{
    id: string;
    title: string;
    status: string;
    peakViewers: number;
    durationMin: number | null;
    gifts: { threads: number; count: number };
    _count: { chatMessages: number; gifts: number };
  }>;
  recentStreams: Array<{
    id: string;
    title: string;
    status: string;
    streamType: string;
    peakViewers: number;
    viewerCount: number;
    startedAt: string | null;
    endedAt: string | null;
    durationMin: number | null;
    gifts: { threads: number; count: number };
    _count: { chatMessages: number; gifts: number };
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchAnalytics(token);
  }, [router, period]);

  async function fetchAnalytics(token: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/creators/analytics?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError('Creator profile required');
          return;
        }
        throw new Error('Failed to load analytics');
      }
      setData(await res.json());
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 safe-area-pb">
          {/* Header skeleton */}
          <div className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 px-6 py-7 mb-8">
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-cyan/40 via-accent-violet/40 to-brand-500/40"
              aria-hidden
            />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <div className="h-9 w-48 bg-white/[0.06] rounded-lg animate-pulse" />
                <div className="h-4 w-56 bg-white/[0.05] rounded mt-3 animate-pulse" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-11 w-14 bg-white/[0.06] rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Summary cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-4xl bg-white/[0.03] border border-white/[0.07] p-6 animate-pulse"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="h-4 w-24 bg-white/[0.06] rounded mb-2" />
                <div className="h-7 w-16 bg-white/[0.08] rounded mb-1" />
                <div className="h-3 w-28 bg-white/[0.05] rounded" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="rounded-4xl bg-white/[0.03] border border-white/[0.07] p-6 mb-8">
            <div className="h-6 w-32 bg-white/[0.06] rounded animate-pulse mb-4" />
            <div className="h-[250px] bg-white/[0.03] rounded-3xl animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="glass-couture px-8 py-12 text-center animate-rise max-w-sm w-full">
            <div className="relative w-16 h-16 mx-auto mb-6 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full gradient-celebration opacity-20 blur-2xl" />
              <div className="absolute inset-1 rounded-full neon-hairline" />
            </div>
            <p className="text-white/80 font-semibold mb-6">{error || 'Something went wrong'}</p>
            <Link href="/dashboard" className="btn-primary inline-flex items-center min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const { summary } = data;

  return (
    <Layout>
      <Head>
        <title>Analytics - Be With Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-24 safe-area-pb">
        {/* ─── Celebration header — slim, CSS color only ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-6 py-7 mb-8" style={{ animationDelay: '0s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-cyan/50 via-accent-violet/50 to-brand-500/50"
            aria-hidden
          />
          <div className="relative z-[2] flex flex-wrap items-end justify-between gap-4">
            <div className="animate-rise">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-2">
                Creator dashboard
              </p>
              <h1 className="font-extrabold tracking-tight text-4xl text-white leading-[1.02]">
                Your <span className="text-celebration">numbers</span>
              </h1>
              <p className="text-white/50 text-sm mt-2.5">How your room is doing.</p>
            </div>
            <div className="glimmer flex gap-1 rounded-full overflow-hidden bg-white/[0.04] border border-white/10 backdrop-blur-xl p-1 no-select">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`h-11 min-h-[44px] min-w-[52px] px-3 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                    period === d
                      ? 'bg-brand-500 text-white shadow-glow-sm'
                      : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Summary Cards — accent-coded glass ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total Streams"
            value={summary.totalStreams.toString()}
            sub={`${summary.periodStreams} in period`}
            accent="violet"
            delay={0}
          />
          <SummaryCard
            label={<><Eye className="w-3.5 h-3.5 inline mr-1" />Total Viewers</>}
            value={summary.totalViewers.toLocaleString()}
            sub={`${summary.avgViewers} avg per stream`}
            accent="cyan"
            delay={80}
          />
          <SummaryCard
            label={<><DollarSign className="w-3.5 h-3.5 inline mr-1" />Earnings</>}
            value={`$${summary.earningsUsd}`}
            sub={`${summary.threadBalance.toLocaleString()} threads`}
            accent="green"
            delay={160}
          />
          <SummaryCard
            label={<><Clock className="w-3.5 h-3.5 inline mr-1" />Avg Duration</>}
            value={`${summary.avgDurationMin}m`}
            sub={`${summary.totalChatMessages.toLocaleString()} chat msgs`}
            accent="amber"
            delay={240}
          />
        </div>

        {/* ─── Viewer Trend Chart — cool cyan/blue ─── */}
        <div className="relative rounded-4xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 mb-8 animate-rise overflow-hidden">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-cyan/40 to-transparent"
            aria-hidden
          />
          <h2 className="text-lg font-bold tracking-tight text-white mb-1">Your crowd</h2>
          <p className="text-xs text-white/40 mb-4">Peak viewers, day by day</p>
          {data.viewerTrend.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-white/40 text-sm">
              No streams this period — go live and watch this fill up
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.viewerTrend}>
                <defs>
                  <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22E0D6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2E9BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.45)' }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.45)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10,10,12,0.94)', border: '1px solid rgba(34,224,214,0.25)', borderRadius: '12px', color: '#fff' }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <Area type="monotone" dataKey="viewers" stroke="#22E0D6" fill="url(#viewerGradient)" strokeWidth={2} name="Peak Viewers" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* ─── Gift Breakdown — magenta love ─── */}
          <div
            className="relative rounded-4xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 animate-rise overflow-hidden"
            style={{ animationDelay: '80ms' }}
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-magenta/40 to-transparent"
              aria-hidden
            />
            <h2 className="text-lg font-bold tracking-tight text-white mb-1">Love received</h2>
            <p className="text-xs text-white/40 mb-4">Gifts from your people</p>
            {data.giftsByType.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
                No gifts yet — the love is coming
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.giftsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.45)' }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.45)' }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(10,10,12,0.94)', border: '1px solid rgba(240,56,255,0.25)', borderRadius: '12px', color: '#fff' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} threads`, 'Value']}
                  />
                  <Bar dataKey="threads" fill="#F038FF" radius={[0, 4, 4, 0]} name="Threads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ─── Top Streams — amber spotlight ─── */}
          <div
            className="relative rounded-4xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 animate-rise overflow-hidden"
            style={{ animationDelay: '160ms' }}
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-amber/40 to-transparent"
              aria-hidden
            />
            <h2 className="text-lg font-bold tracking-tight text-white mb-1">Biggest moments</h2>
            <p className="text-xs text-white/40 mb-4">Your top streams this period</p>
            {data.topStreams.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
                No streams yet — your first one starts the story
              </div>
            ) : (
              <div className="space-y-3">
                {data.topStreams.map((stream, i) => (
                  <Link
                    key={stream.id}
                    href={`/stream/${stream.id}`}
                    className="flex items-center gap-3 min-h-[44px] hover:bg-white/[0.05] rounded-2xl p-2 -mx-2 transition-colors"
                  >
                    <span
                      className={`text-lg font-extrabold w-6 text-center ${
                        i === 0 ? 'text-accent-amber' : i === 1 ? 'text-accent-cyan' : i === 2 ? 'text-accent-violet' : 'text-white/30'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{stream.title}</p>
                      <p className="text-xs text-white/45">
                        {stream.peakViewers} viewers
                        {stream.durationMin !== null && ` · ${stream.durationMin}m`}
                        {stream.gifts.count > 0 && ` · ${stream.gifts.count} gifts`}
                      </p>
                    </div>
                    <StatusBadge status={stream.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Recent Streams Table ─── */}
        <div
          className="relative rounded-4xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 animate-rise overflow-hidden"
          style={{ animationDelay: '240ms' }}
        >
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-violet/40 to-transparent"
            aria-hidden
          />
          <h2 className="text-lg font-bold tracking-tight text-white mb-1">Latest streams</h2>
          <p className="text-xs text-white/40 mb-4">Every session, at a glance</p>
          {data.recentStreams.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-sm">No streams in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-white/40">Stream</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-white/40 text-center">Status</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-accent-cyan/70 text-right">Viewers</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-white/40 text-right hidden md:table-cell">Duration</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-white/40 text-right hidden md:table-cell">Chat</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-[11px] text-accent-magenta/70 text-right">Gifts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.recentStreams.map((stream) => (
                    <tr key={stream.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/stream/${stream.id}`} className="text-white hover:text-brand-500 font-medium truncate block max-w-[200px] transition-colors">
                          {stream.title}
                        </Link>
                        {stream.startedAt && (
                          <p className="text-xs text-white/35 mt-0.5">
                            {new Date(stream.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-center"><StatusBadge status={stream.status} /></td>
                      <td className="py-3 text-right text-white/85">{stream.peakViewers.toLocaleString()}</td>
                      <td className="py-3 text-right text-white/70 hidden md:table-cell">
                        {stream.durationMin !== null ? `${stream.durationMin}m` : '—'}
                      </td>
                      <td className="py-3 text-right text-white/70 hidden md:table-cell">{stream._count.chatMessages}</td>
                      <td className="py-3 text-right">
                        {stream.gifts.count > 0 ? (
                          <span className="text-accent-magenta font-semibold">{stream.gifts.threads.toLocaleString()}</span>
                        ) : (
                          <span className="text-white/30">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const ACCENT_STYLES: Record<string, { border: string; glow: string; value: string; hairline: string }> = {
  violet: {
    border: 'border-accent-violet/25 hover:border-accent-violet/45',
    glow: 'hover:shadow-glow-violet',
    value: 'text-accent-violet',
    hairline: 'via-accent-violet/50',
  },
  cyan: {
    border: 'border-accent-cyan/25 hover:border-accent-cyan/45',
    glow: 'hover:shadow-glow-cyan',
    value: 'text-accent-cyan',
    hairline: 'via-accent-cyan/50',
  },
  green: {
    border: 'border-accent-green/25 hover:border-accent-green/45',
    glow: 'hover:shadow-glow-green',
    value: 'text-accent-green',
    hairline: 'via-accent-green/50',
  },
  amber: {
    border: 'border-accent-amber/25 hover:border-accent-amber/45',
    glow: 'hover:shadow-glow-amber',
    value: 'text-accent-amber',
    hairline: 'via-accent-amber/50',
  },
};

function SummaryCard({
  label,
  value,
  sub,
  accent = 'violet',
  delay = 0,
}: {
  label: React.ReactNode;
  value: string;
  sub: string;
  accent?: keyof typeof ACCENT_STYLES;
  delay?: number;
}) {
  const a = ACCENT_STYLES[accent] || ACCENT_STYLES.violet;
  return (
    <div
      className={`glimmer relative rounded-4xl bg-white/[0.03] backdrop-blur-xl border ${a.border} ${a.glow} p-6 transition-all duration-300 animate-rise overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent ${a.hairline} to-transparent`}
        aria-hidden
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-1.5">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight ${a.value}`}>{value}</p>
      <p className="text-xs text-white/40 mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LIVE: 'bg-live/15 text-live shadow-glow-live',
    ENDED: 'bg-white/[0.06] text-white/50',
    ARCHIVED: 'bg-accent-blue/15 text-accent-blue',
    SCHEDULED: 'bg-accent-amber/15 text-accent-amber',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold tracking-wide ${styles[status] || styles.ENDED}`}>
      {status}
    </span>
  );
}
