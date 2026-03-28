import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';

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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-gray-400 text-lg">Loading dashboard...</div>
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
            />
            <StatCard
              label="Thread Balance"
              value={(data.creator?.threadBalance || 0).toLocaleString()}
            />
            <StatCard
              label="Total Streams"
              value={data.stats.totalStreams.toString()}
            />
            <StatCard
              label="Peak Viewers"
              value={data.stats.totalViewers.toLocaleString()}
            />
          </div>
        )}

        {/* Viewer Stats */}
        {!isCreator && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard
              label="Thread Balance"
              value={data.user.threadBalance.toLocaleString()}
            />
            <StatCard
              label="Subscription"
              value="Active"
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
                  icon="📅"
                />
                <ActionCard
                  title="Create Giveaway"
                  description="Launch a new giveaway for fans"
                  href="/dashboard/giveaways"
                  icon="🎁"
                />
                <ActionCard
                  title="View Analytics"
                  description="Track your growth and earnings"
                  href="/dashboard/analytics"
                  icon="📊"
                />
              </>
            )}
            <ActionCard
              title="Browse Streams"
              description="Discover live fashion content"
              href="/streams"
              icon="🎬"
            />
            <ActionCard
              title="Buy Threads"
              description="Get currency to send gifts"
              href="/dashboard/threads"
              icon="🧵"
            />
            <ActionCard
              title="Edit Profile"
              description="Update your bio and avatar"
              href="/profile"
              icon="✏️"
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link href={href} className="card p-6 hover:shadow-lg transition-shadow flex items-start gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
