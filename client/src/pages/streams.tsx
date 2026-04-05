import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { CreatorCard } from '@/components/ui/CreatorCard';
import { Radio, Calendar, Archive, Play } from 'lucide-react';

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
  muxPlaybackId: string | null;
  creator: {
    category?: string;
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
        <title>Browse Streams - Be With Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto px-4 py-6">
        {/* Header with feed link */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Discover</h1>
            <p className="text-gray-500 text-sm">Live fashion content from top creators</p>
          </div>
          <Link
            href="/feed"
            className="flex items-center gap-1.5 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            <Play className="w-3.5 h-3.5" fill="white" />
            Watch Feed
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 mb-6">
          {(['LIVE', 'SCHEDULED', 'ARCHIVED'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'LIVE' && <Radio className="w-3 h-3 text-red-500" />}
              {t === 'SCHEDULED' && <Calendar className="w-3 h-3" />}
              {t === 'ARCHIVED' && <Archive className="w-3 h-3" />}
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Stream Grid (vertical cards like TikTok browse) */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              {tab === 'LIVE' && <Radio className="w-7 h-7 text-gray-400" />}
              {tab === 'SCHEDULED' && <Calendar className="w-7 h-7 text-gray-400" />}
              {tab === 'ARCHIVED' && <Archive className="w-7 h-7 text-gray-400" />}
            </div>
            <p className="text-gray-500 font-medium mb-1">
              {tab === 'LIVE' && 'No one is live right now'}
              {tab === 'SCHEDULED' && 'No upcoming streams'}
              {tab === 'ARCHIVED' && 'No archived streams yet'}
            </p>
            <p className="text-gray-400 text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {streams.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <CreatorCard
                  streamId={stream.id}
                  title={stream.title}
                  creatorName={stream.creator.user.displayName}
                  creatorUsername={stream.creator.user.username}
                  avatarUrl={stream.creator.user.avatarUrl}
                  muxPlaybackId={stream.muxPlaybackId}
                  isLive={stream.status === 'LIVE'}
                  viewerCount={stream.viewerCount}
                  streamType={stream.streamType}
                  category={stream.creator.category}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
