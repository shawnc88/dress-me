import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { Layout } from '@/components/layout/Layout';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';

interface StreamData {
  id: string;
  title: string;
  status: string;
  streamType: string;
  viewerCount: number;
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
  const [showGifts, setShowGifts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Fetch stream data
    fetch(`/api/streams/${id}`)
      .then((r) => r.json())
      .then((data) => setStream(data.stream))
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!videoRef.current || !stream || stream.status !== 'LIVE') return;

    // HLS.js for adaptive bitrate streaming
    const hlsUrl = `${process.env.NEXT_PUBLIC_CDN_URL || ''}/live/${id}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = hlsUrl;
    }
  }, [stream, id]);

  if (!stream) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-gray-400">Loading stream...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{stream.title} - Dress Me</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* Video Player */}
          <div className="relative">
            <div className="video-container bg-black rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                poster="/placeholder-stream.jpg"
              />

              {/* Live badge */}
              {stream.status === 'LIVE' && (
                <div className="absolute top-4 left-4">
                  <span className="badge-live">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                </div>
              )}

              {/* Viewer count */}
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                👁 {stream.viewerCount.toLocaleString()}
              </div>

              {/* Active poll overlay */}
              {stream.polls.length > 0 && (
                <PollOverlay poll={stream.polls[0]} streamId={stream.id} />
              )}

              {/* Chat overlay on mobile */}
              <div className="lg:hidden">
                <ChatOverlay streamId={stream.id} />
              </div>
            </div>

            {/* Stream info */}
            <div className="mt-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">{stream.title}</h1>
                <p className="text-gray-500">
                  {stream.creator.user.displayName} · @{stream.creator.user.username}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGifts(!showGifts)}
                  className="btn-primary !px-4 !py-2 text-sm"
                >
                  🧵 Send Gift
                </button>
                <button className="btn-secondary !px-4 !py-2 text-sm">
                  🛍️ Shop
                </button>
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
              </div>
              <ChatOverlay streamId={stream.id} sidebar />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
