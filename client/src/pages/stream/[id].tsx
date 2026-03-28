import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Layout } from '@/components/layout/Layout';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';

// Dynamic import to avoid SSR issues with Mux Player web component
const VideoSurface = dynamic(
  () => import('@/components/video/VideoSurface').then((m) => m.VideoSurface),
  { ssr: false }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  muxPlaybackId: string | null;
  creator: {
    user: { username: string; displayName: string; avatarUrl?: string };
  };
  polls: Array<{ id: string; question: string; options: any[]; isActive: boolean }>;
}

export default function StreamPage() {
  const router = useRouter();
  const { id } = router.query;
  const [stream, setStream] = useState<StreamData | null>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showGifts, setShowGifts] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`${API_URL}/api/streams/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Stream not found');
        return r.json();
      })
      .then((data) => {
        setStream(data.stream);
        // playbackId comes from the stream model or the API response
        setPlaybackId(data.stream?.muxPlaybackId || null);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-4">{error}</p>
            <button onClick={() => router.push('/streams')} className="btn-primary">
              Browse Streams
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stream) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-gray-400">Loading stream...</div>
        </div>
      </Layout>
    );
  }

  const isLive = stream.status === 'LIVE';
  const uptime = stream.startedAt
    ? Math.round((Date.now() - new Date(stream.startedAt).getTime()) / 60000)
    : 0;

  return (
    <Layout>
      <Head>
        <title>{stream.title} - Dress Me</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* Video Player */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden relative bg-black">
              <VideoSurface
                playbackId={playbackId}
                streamStatus={stream.status}
                creatorName={stream.creator.user.displayName}
                title={stream.title}
                isLive={isLive}
              />

              {/* Live badge overlay */}
              {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <span className="badge-live">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {uptime}m
                  </span>
                </div>
              )}

              {/* Viewer count */}
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
                {stream.viewerCount.toLocaleString()} watching
              </div>

              {/* Active poll overlay */}
              {stream.polls && stream.polls.length > 0 && (
                <PollOverlay poll={stream.polls[0]} streamId={stream.id} />
              )}

              {/* Chat overlay on mobile */}
              <div className="lg:hidden">
                <ChatOverlay streamId={stream.id} />
              </div>
            </div>

            {/* Stream info */}
            <div className="mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold">{stream.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm font-bold text-brand-600">
                      {stream.creator.user.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{stream.creator.user.displayName}</p>
                      <p className="text-xs text-gray-500">@{stream.creator.user.username}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGifts(!showGifts)}
                    className="btn-primary !px-4 !py-2 text-sm"
                  >
                    🧵 Send Gift
                  </button>
                </div>
              </div>
              {stream.description && (
                <p className="text-sm text-gray-500 mt-3">{stream.description}</p>
              )}
              <div className="flex gap-4 mt-3 text-sm text-gray-400">
                <span>Peak: {stream.peakViewers} viewers</span>
                {isLive && <span>Live for {uptime} min</span>}
              </div>
            </div>

            {showGifts && <GiftPanel streamId={stream.id} onClose={() => setShowGifts(false)} />}
          </div>

          {/* Desktop chat sidebar */}
          <div className="hidden lg:block">
            <div className="card h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold">Live Chat</h3>
                {isLive && (
                  <p className="text-xs text-gray-400">{stream.viewerCount} watching</p>
                )}
              </div>
              <ChatOverlay streamId={stream.id} sidebar />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
