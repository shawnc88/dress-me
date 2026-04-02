import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import {
  ChevronLeft, X, Eye, Clock, Shirt, Radio, Volume2, VolumeX,
} from 'lucide-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StreamItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  muxPlaybackId: string | null;
  startedAt: string | null;
  creator: {
    category?: string;
    user: { username: string; displayName: string; avatarUrl: string | null };
  };
}

export default function FeedPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStreams() {
      try {
        const [liveRes, scheduledRes] = await Promise.all([
          fetch(`${API_URL}/api/streams?status=LIVE&limit=20`),
          fetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`),
        ]);
        const liveData = liveRes.ok ? await liveRes.json() : { streams: [] };
        const scheduledData = scheduledRes.ok ? await scheduledRes.json() : { streams: [] };
        const all = [...(liveData.streams || []), ...(scheduledData.streams || [])];
        setStreams(all);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchStreams();
  }, []);

  // Snap scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) setActiveIndex(index);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const items = container.querySelectorAll('[data-index]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [streams]);

  const activeStream = streams[activeIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center px-6">
        <Shirt className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">No streams yet</h2>
        <p className="text-white/50 text-sm mb-6">Be the first to go live!</p>
        <button
          onClick={() => router.push('/become-creator')}
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Become a Creator
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Live Feed - Dress Me</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      {/* Full-screen snap-scroll container */}
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {streams.map((stream, index) => (
          <FeedItem
            key={stream.id}
            stream={stream}
            index={index}
            isActive={index === activeIndex}
            isLiked={!!liked[stream.id]}
            onLike={() => setLiked((prev) => ({ ...prev, [stream.id]: !prev[stream.id] }))}
            onGift={() => setShowGifts(true)}
            showChat={showChat}
            onToggleChat={() => setShowChat(!showChat)}
          />
        ))}
      </div>

      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </motion.button>

          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs font-medium">
              {activeIndex + 1} / {streams.length}
            </span>
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

      {/* Gift panel bottom sheet */}
      <AnimatePresence>
        {showGifts && activeStream && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[60]"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-t-3xl border-t border-gray-800 p-6 max-h-[50vh]">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              <GiftPanel streamId={activeStream.id} onClose={() => setShowGifts(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Individual Feed Item (Full Screen) ─── */
function FeedItem({
  stream,
  index,
  isActive,
  isLiked,
  onLike,
  onGift,
  showChat,
  onToggleChat,
}: {
  stream: StreamItem;
  index: number;
  isActive: boolean;
  isLiked: boolean;
  onLike: () => void;
  onGift: () => void;
  showChat: boolean;
  onToggleChat: () => void;
}) {
  const isLive = stream.status === 'LIVE';
  const uptime = stream.startedAt
    ? Math.round((Date.now() - new Date(stream.startedAt).getTime()) / 60000)
    : 0;

  return (
    <div
      data-index={index}
      className="relative w-full h-screen snap-start snap-always flex-shrink-0"
    >
      {/* Video / Thumbnail background */}
      <div className="absolute inset-0">
        {stream.muxPlaybackId && isActive ? (
          <MuxPlayer
            playbackId={stream.muxPlaybackId}
            streamType={isLive ? 'live' : 'on-demand'}
            autoPlay={isActive ? 'muted' : false}
            muted
            playsInline
            loop={!isLive}
            style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
            primaryColor="#ec4899"
            accentColor="#8b5cf6"
          />
        ) : stream.muxPlaybackId ? (
          <img
            src={`https://image.mux.com/${stream.muxPlaybackId}/thumbnail.jpg?time=5&width=720&height=1280&fit_mode=crop`}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-900 via-purple-900 to-black flex items-center justify-center">
            <Shirt className="w-20 h-20 text-white/10" />
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="text-white/40 text-xs">|</span>
            <span className="flex items-center gap-1 text-white/70 text-xs">
              <Eye className="w-3 h-3" />
              {stream.viewerCount.toLocaleString()}
            </span>
            <span className="text-white/40 text-xs">|</span>
            <span className="flex items-center gap-1 text-white/70 text-xs">
              <Clock className="w-3 h-3" />
              {uptime}m
            </span>
          </div>
        </div>
      )}

      {/* Right side floating actions */}
      <div className="absolute right-3 bottom-56 z-30">
        <FloatingActions
          liked={isLiked}
          likeCount={stream.peakViewers}
          onLike={onLike}
          onComment={onToggleChat}
          onGift={onGift}
          showFollow
        />
      </div>

      {/* Bottom: creator info + stream details */}
      <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-8 safe-area-pb">
        {/* Creator info */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 ${isLive ? 'border-red-500' : 'border-white/30'}`}>
            {stream.creator.user.avatarUrl ? (
              <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-brand-500/30 flex items-center justify-center text-xs font-bold text-white">
                {stream.creator.user.displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">@{stream.creator.user.username}</p>
            <p className="text-white/50 text-xs">{stream.creator.user.displayName}</p>
          </div>
          <button className="ml-auto px-4 py-1.5 rounded-full border border-white/30 text-white text-xs font-semibold hover:bg-white/10 transition-colors">
            Follow
          </button>
        </div>

        {/* Title + description */}
        <h3 className="text-white font-semibold text-base mb-1">{stream.title}</h3>
        {stream.description && (
          <p className="text-white/60 text-sm line-clamp-2 mb-3">{stream.description}</p>
        )}

        {/* Chat overlay */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-36 overflow-hidden"
            >
              <ChatOverlay streamId={stream.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
