import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { CalendarPlus, Gift, BarChart3, Tv, Sparkles, UserPen } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DashboardData {
  user: {
    id: string;
    displayName: string;
    username: string;
    role: string;
    threadBalance: number;
  };
  creator?: {
    totalEarnings: number;
    threadBalance: number;
    isLive: boolean;
    streamKey: string;
  };
  streams: Array<{
    id: string;
    title: string;
    status: string;
    viewerCount: number;
    peakViewers: number;
    startedAt: string | null;
    scheduledFor: string | null;
  }>;
  stats: {
    totalStreams: number;
    totalViewers: number;
    avgViewers: number;
    totalGiftsReceived: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchDashboard(token);
  }, [router]);

  async function fetchDashboard(token: string) {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [userRes, streamsRes] = await Promise.all([
        fetch(`${API_URL}/api/auth/me`, { headers }),
        fetch(`${API_URL}/api/streams?status=LIVE`, { headers }),
      ]);

      if (!userRes.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
        return;
      }

      const userData = await userRes.json();
      const streamsData = await streamsRes.json();

      // Fetch creator-specific data if applicable
      let creatorData = null;
      if (userData.user.role === 'CREATOR' || userData.user.role === 'ADMIN') {
        const creatorRes = await fetch(`${API_URL}/api/creators/me`, { headers });
        if (creatorRes.ok) {
          creatorData = await creatorRes.json();
        }
      }

      setData({
        user: userData.user,
        creator: creatorData?.creator,
        streams: streamsData.streams || [],
        stats: creatorData?.stats || {
          totalStreams: 0,
          totalViewers: 0,
          avgViewers: 0,
          totalGiftsReceived: 0,
        },
      });
    } catch {
      setError('Failed to load dashboard');
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
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
            </div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-6 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Live section skeleton */}
          <div className="mb-8">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="card p-8">
              <div className="h-5 w-64 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          {/* Actions skeleton */}
          <div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="grid md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-red-500">{error || 'Something went wrong'}</div>
        </div>
      </Layout>
    );
  }

  const isCreator = data.user.role === 'CREATOR' || data.user.role === 'ADMIN';

  return (
    <Layout>
      <Head>
        <title>Dashboard - Dress Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Hey, {data.user.displayName}
            </h1>
            <p className="text-gray-500 mt-1">
              @{data.user.username} &middot; <span className="capitalize">{data.user.role.toLowerCase()}</span>
            </p>
          </div>
          {isCreator && (
            <Link href="/dashboard/go-live" className="btn-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Go Live
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        {isCreator && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Earnings"
              value={`$${((data.creator?.totalEarnings || 0) / 100).toFixed(2)}`}
              borderColor="border-green-500"
            />
            <StatCard
              label="Thread Balance"
              value={(data.creator?.threadBalance || 0).toLocaleString()}
              borderColor="border-amber-500"
            />
            <StatCard
              label="Total Streams"
              value={data.stats.totalStreams.toString()}
              borderColor="border-brand-500"
            />
            <StatCard
              label="Peak Viewers"
              value={data.stats.totalViewers.toLocaleString()}
              borderColor="border-blue-500"
            />
          </div>
        )}

        {/* Viewer Stats */}
        {!isCreator && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard
              label="Thread Balance"
              value={data.user.threadBalance.toLocaleString()}
              borderColor="border-amber-500"
            />
            <StatCard
              label="Subscription"
              value="Active"
              borderColor="border-green-500"
            />
          </div>
        )}

        {/* Live Streams */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Live Now</h2>
          {data.streams.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              No streams are live right now. Check back soon!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.streams.map((stream) => (
                <Link key={stream.id} href={`/stream/${stream.id}`} className="card p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <span className="badge-live">Live</span>
                    <span className="text-sm text-gray-400">{stream.viewerCount} watching</span>
                  </div>
                  <h3 className="font-semibold mb-1 line-clamp-1">{stream.title}</h3>
                  <p className="text-sm text-gray-500">Peak: {stream.peakViewers} viewers</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {isCreator && (
              <>
                <ActionCard
                  title="Schedule Stream"
                  description="Plan your next live session"
                  href="/dashboard/schedule"
                  icon={
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50 dark:bg-brand-950">
                      <CalendarPlus className="w-6 h-6 text-brand-600" />
                    </div>
                  }
                />
                <ActionCard
                  title="Create Giveaway"
                  description="Launch a new giveaway for fans"
                  href="/dashboard/giveaways"
                  icon={
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950">
                      <Gift className="w-6 h-6 text-purple-600" />
                    </div>
                  }
                />
                <ActionCard
                  title="View Analytics"
                  description="Track your growth and earnings"
                  href="/dashboard/analytics"
                  icon={
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                  }
                />
              </>
            )}
            <ActionCard
              title="Browse Streams"
              description="Discover live fashion content"
              href="/streams"
              icon={
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950">
                  <Tv className="w-6 h-6 text-red-600" />
                </div>
              }
            />
            <ActionCard
              title="Buy Threads"
              description="Get currency to send gifts"
              href="/dashboard/threads"
              icon={
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
              }
            />
            <ActionCard
              title="Edit Profile"
              description="Update your bio and avatar"
              href="/profile"
              icon={
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-950">
                  <UserPen className="w-6 h-6 text-green-600" />
                </div>
              }
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, borderColor }: { label: string; value: string; borderColor: string }) {
  return (
    <div className={`card p-6 border-t-2 ${borderColor}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="card p-6 hover:shadow-lg transition-shadow flex items-start gap-4">
      {icon}
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
