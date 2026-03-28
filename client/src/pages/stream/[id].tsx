import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';

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
  creator: {
    user: { username: string; displayName: string; avatarUrl?: string };
  };
  polls: Array<{ id: string; question: string; options: any[]; isActive: boolean }>;
}

export default function StreamPage() {
  const router = useRouter();
  const { id } = router.query;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<StreamData | null>(null);
  const [error, setError] = useState('');
  const [showGifts, setShowGifts] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`${API_URL}/api/streams/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Stream not found');
        return r.json();
      })
      .then((data) => setStream(data.stream))
      .catch((err) => setError(err.message));
  }, [id]);

  // Try to load HLS if a CDN URL is configured
  useEffect(() => {
    if (!videoRef.current || !stream || stream.status !== 'LIVE') return;

    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    if (!cdnUrl) return; // No video server configured yet

    import('hls.js').then(({ default: Hls }) => {
      if (!videoRef.current) return;
      const hlsUrl = `${cdnUrl}/live/${id}/index.m3u8`;

      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.ERROR, () => {
          // Silently fail — placeholder will show
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl;
      }
    });
  }, [stream, id]);

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
            <div className="video-container bg-black rounded-2xl overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover hidden"
                autoPlay
                playsInline
                muted
              />

              {/* Placeholder when no video feed */}
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
                <span className="text-6xl mb-4">👗</span>
                {isLive ? (
                  <>
                    <p className="text-white text-lg font-semibold mb-1">{stream.creator.user.displayName} is Live</p>
                    <p className="text-white/60 text-sm">Video streaming server not configured yet</p>
                    <p className="text-white/40 text-xs mt-2">Chat is fully functional below!</p>
                  </>
                ) : (
                  <>
                    <p className="text-white/60 text-lg">Stream {stream.status.toLowerCase()}</p>
                    {stream.status === 'SCHEDULED' && (
                      <p className="text-white/40 text-sm mt-1">Check back when the creator goes live</p>
                    )}
                  </>
                )}
              </div>

              {/* Live badge */}
              {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
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
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
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

              {/* Stats */}
              <div className="flex gap-4 mt-3 text-sm text-gray-400">
                <span>Peak: {stream.peakViewers} viewers</span>
                {isLive && <span>Live for {uptime} min</span>}
              </div>
            </div>

            {/* Gift panel */}
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
