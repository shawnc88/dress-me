import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { X, ChevronLeft, Eye, Clock } from 'lucide-react';

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
  const [tokens, setTokens] = useState<{ video?: string; thumbnail?: string; storyboard?: string } | null>(null);
  const [error, setError] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`${API_URL}/api/streams/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Stream not found');
        return r.json();
      })
      .then((data) => {
        setStream(data.stream);
        setPlaybackId(data.stream?.muxPlaybackId || null);
        if (data.tokens) setTokens(data.tokens);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  function handleLike() {
    setLiked(!liked);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{error}</p>
          <button onClick={() => router.push('/streams')} className="btn-primary">
            Browse Streams
          </button>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLive = stream.status === 'LIVE';
  const uptime = stream.startedAt
    ? Math.round((Date.now() - new Date(stream.startedAt).getTime()) / 60000)
    : 0;

  return (
    <>
      <Head>
        <title>{stream.title} - Dress Me</title>
      </Head>

      {/* ─── Full-Screen Vertical Layout ─── */}
      <div className="fixed inset-0 bg-black">
        {/* Video fills entire screen */}
        <div className="absolute inset-0">
          <VideoSurface
            playbackId={playbackId}
            streamStatus={stream.status}
            creatorName={stream.creator.user.displayName}
            title={stream.title}
            isLive={isLive}
            tokens={tokens}
          />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* ─── Top Bar ─── */}
        <div className="absolute top-0 left-0 right-0 z-30 safe-area-pt">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Back + Creator info */}
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </motion.button>

              <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-sm rounded-full pl-1 pr-4 py-1">
                <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${isLive ? 'ring-2 ring-red-500' : ''}`}>
                  {stream.creator.user.avatarUrl ? (
                    <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-300">
                      {stream.creator.user.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{stream.creator.user.displayName}</p>
                  <p className="text-white/50 text-[10px]">@{stream.creator.user.username}</p>
                </div>
              </div>
            </div>

            {/* Live badge + viewers + close */}
            <div className="flex items-center gap-2">
              {isLive && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-white/50 text-[10px]">|</span>
                  <span className="flex items-center gap-1 text-white/70 text-xs">
                    <Eye className="w-3 h-3" />
                    {stream.viewerCount.toLocaleString()}
                  </span>
                  <span className="text-white/50 text-[10px]">|</span>
                  <span className="flex items-center gap-1 text-white/70 text-xs">
                    <Clock className="w-3 h-3" />
                    {uptime}m
                  </span>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push('/')}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ─── Right Side Actions (BIGO/TikTok style) ─── */}
        <div className="absolute right-3 bottom-72 z-30">
          <FloatingActions
            liked={liked}
            likeCount={stream.peakViewers}
            onLike={handleLike}
            onComment={() => setShowChat(!showChat)}
            onGift={() => setShowGifts(!showGifts)}
            showFollow
          />
        </div>

        {/* ─── Bottom: Creator info + stream title ─── */}
        <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-8 safe-area-pb">
          {/* Stream title + description */}
          <div className="mb-3">
            <h2 className="text-white font-bold text-base mb-1">{stream.title}</h2>
            {stream.description && (
              <p className="text-white/60 text-sm line-clamp-2">{stream.description}</p>
            )}
          </div>

          {/* Chat overlay */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-48 overflow-hidden"
              >
                <ChatOverlay streamId={stream.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Active Poll Overlay ─── */}
        {stream.polls && stream.polls.length > 0 && (
          <div className="absolute top-20 left-4 right-4 z-30">
            <PollOverlay poll={stream.polls[0]} streamId={stream.id} />
          </div>
        )}

        {/* ─── Gift Panel (Bottom Sheet) ─── */}
        <AnimatePresence>
          {showGifts && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute bottom-0 left-0 right-0 z-40"
            >
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-t-3xl border-t border-gray-800 p-6 max-h-[50vh]">
                <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
                <GiftPanel streamId={stream.id} onClose={() => setShowGifts(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
