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
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Summary cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="card p-6 mb-8">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-[250px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Something went wrong'}</p>
            <Link href="/dashboard" className="btn-primary inline-flex items-center">
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Analytics</h1>
            <p className="text-gray-500 mt-1">Track your growth and performance</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === d
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total Streams" value={summary.totalStreams.toString()} sub={`${summary.periodStreams} in period`} />
          <SummaryCard label={<><Eye className="w-3.5 h-3.5 inline mr-1" />Total Viewers</>} value={summary.totalViewers.toLocaleString()} sub={`${summary.avgViewers} avg per stream`} />
          <SummaryCard label={<><DollarSign className="w-3.5 h-3.5 inline mr-1" />Earnings</>} value={`$${summary.earningsUsd}`} sub={`${summary.threadBalance.toLocaleString()} threads`} />
          <SummaryCard label={<><Clock className="w-3.5 h-3.5 inline mr-1" />Avg Duration</>} value={`${summary.avgDurationMin}m`} sub={`${summary.totalChatMessages.toLocaleString()} chat msgs`} />
        </div>

        {/* Viewer Trend Chart */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Viewer Trend</h2>
          {data.viewerTrend.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No stream data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.viewerTrend}>
                <defs>
                  <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <Area type="monotone" dataKey="viewers" stroke="#ec4899" fill="url(#viewerGradient)" strokeWidth={2} name="Peak Viewers" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Gift Breakdown */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Gifts Received</h2>
            {data.giftsByType.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                No gifts in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.giftsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 12, fill: '#9ca3af' }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} threads`, 'Value']}
                  />
                  <Bar dataKey="threads" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Threads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Streams */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Top Streams</h2>
            {data.topStreams.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                No streams yet
              </div>
            ) : (
              <div className="space-y-3">
                {data.topStreams.map((stream, i) => (
                  <Link key={stream.id} href={`/stream/${stream.id}`} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors">
                    <span className="text-lg font-bold text-gray-400 w-6 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{stream.title}</p>
                      <p className="text-xs text-gray-500">
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

        {/* Recent Streams Table */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Recent Streams</h2>
          {data.recentStreams.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No streams in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="pb-3 font-medium text-gray-500">Stream</th>
                    <th className="pb-3 font-medium text-gray-500 text-center">Status</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Viewers</th>
                    <th className="pb-3 font-medium text-gray-500 text-right hidden md:table-cell">Duration</th>
                    <th className="pb-3 font-medium text-gray-500 text-right hidden md:table-cell">Chat</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Gifts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.recentStreams.map((stream) => (
                    <tr key={stream.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 pr-4">
                        <Link href={`/stream/${stream.id}`} className="hover:text-brand-500 font-medium truncate block max-w-[200px]">
                          {stream.title}
                        </Link>
                        {stream.startedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(stream.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-center"><StatusBadge status={stream.status} /></td>
                      <td className="py-3 text-right">{stream.peakViewers.toLocaleString()}</td>
                      <td className="py-3 text-right hidden md:table-cell">
                        {stream.durationMin !== null ? `${stream.durationMin}m` : '\u2014'}
                      </td>
                      <td className="py-3 text-right hidden md:table-cell">{stream._count.chatMessages}</td>
                      <td className="py-3 text-right">
                        {stream.gifts.count > 0 ? (
                          <span className="text-purple-500 font-medium">{stream.gifts.threads.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
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

function SummaryCard({ label, value, sub }: { label: React.ReactNode; value: string; sub: string }) {
  return (
    <div className="card p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LIVE: 'bg-red-500/10 text-red-500',
    ENDED: 'bg-gray-500/10 text-gray-500',
    ARCHIVED: 'bg-blue-500/10 text-blue-500',
    SCHEDULED: 'bg-yellow-500/10 text-yellow-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.ENDED}`}>
      {status}
    </span>
  );
}
