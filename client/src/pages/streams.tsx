import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  scheduledFor: string | null;
  creator: {
    user: { username: string; displayName: string; avatarUrl: string | null };
  };
}

type Tab = 'LIVE' | 'SCHEDULED' | 'ARCHIVED';

export default function Streams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [tab, setTab] = useState<Tab>('LIVE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/streams?status=${tab}&limit=50`)
      .then((r) => r.json())
      .then((data) => setStreams(data.streams || []))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <Layout>
      <Head>
        <title>Browse Streams - Dress Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Browse Streams</h1>
        <p className="text-gray-500 mb-8">Discover live fashion content from top creators</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-8 w-fit">
          {(['LIVE', 'SCHEDULED', 'ARCHIVED'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'LIVE' && '🔴 '}
              {t === 'SCHEDULED' && '📅 '}
              {t === 'ARCHIVED' && '📼 '}
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Stream Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading streams...</div>
        ) : streams.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">
              {tab === 'LIVE' && 'No one is live right now'}
              {tab === 'SCHEDULED' && 'No upcoming streams scheduled'}
              {tab === 'ARCHIVED' && 'No archived streams yet'}
            </p>
            <p className="text-gray-400 text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  return (
    <Link href={`/stream/${stream.id}`} className="card overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-gradient-to-br from-brand-600 to-purple-800 relative flex items-center justify-center">
        <span className="text-white/30 text-5xl">👗</span>
        {stream.status === 'LIVE' && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="badge-live">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Live
            </span>
            <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {stream.viewerCount} watching
            </span>
          </div>
        )}
        {stream.status === 'SCHEDULED' && stream.scheduledFor && (
          <div className="absolute top-3 left-3">
            <span className="bg-brand-600 text-white text-xs px-2 py-1 rounded-full">
              {new Date(stream.scheduledFor).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
        {stream.streamType !== 'PUBLIC' && (
          <div className="absolute top-3 right-3">
            <span className={`badge-${stream.streamType.toLowerCase()}`}>
              {stream.streamType}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold line-clamp-1 group-hover:text-brand-600 transition-colors">
          {stream.title}
        </h3>
        {stream.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{stream.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-600">
            {stream.creator.user.displayName.charAt(0)}
          </div>
          <span className="text-sm text-gray-500">{stream.creator.user.displayName}</span>
          {stream.status === 'ARCHIVED' && (
            <span className="text-xs text-gray-400 ml-auto">
              Peak: {stream.peakViewers} viewers
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
