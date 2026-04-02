import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { AnimatedLiveBadge } from '@/components/ui/AnimatedLiveBadge';
import { GlassBottomSheet } from '@/components/ui/GlassBottomSheet';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { useFeedEvents } from '@/hooks/useFeedEvents';
import { Search, Shirt, Sparkles, Radio } from 'lucide-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FeedCreator {
  creatorId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  category: string;
  isLive: boolean;
  streamId: string | null;
  streamTitle: string | null;
  streamStatus: string | null;
  muxPlaybackId: string | null;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  streamType: string | null;
  score: number;
  bucket: string;
}

type FeedTab = 'for_you' | 'following';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('for_you');
  const [items, setItems] = useState<FeedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const { trackEvent, trackViewDuration } = useFeedEvents();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API_URL}/api/feed`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_URL}/api/streams?status=LIVE&limit=20`).then(r => r.ok ? r.json() : { streams: [] }).catch(() => ({ streams: [] })),
      fetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`).then(r => r.ok ? r.json() : { streams: [] }).catch(() => ({ streams: [] })),
    ]).then(([feedData, liveData, scheduledData]) => {
      // Combine algorithm feed + raw streams into one list
      const feedItems: FeedCreator[] = [];

      if (feedData?.feed) {
        const { liveNow, forYou, rising, premium, newFaces } = feedData.feed;
        // Interleave: live first, then mix buckets
        feedItems.push(...(liveNow || []), ...(forYou || []), ...(rising || []), ...(premium || []), ...(newFaces || []));
      }

      // If no algorithm results, convert raw streams to feed items
      if (feedItems.length === 0) {
        const streams = [...(liveData.streams || []), ...(scheduledData.streams || [])];
        for (const s of streams) {
          feedItems.push({
            creatorId: s.creatorId || s.creator?.id || '',
            userId: s.creator?.user?.id || '',
            username: s.creator?.user?.username || 'creator',
            displayName: s.creator?.user?.displayName || 'Creator',
            avatarUrl: s.creator?.user?.avatarUrl || null,
            category: s.creator?.category || 'fashion',
            isLive: s.status === 'LIVE',
            streamId: s.id,
            streamTitle: s.title,
            streamStatus: s.status,
            muxPlaybackId: s.muxPlaybackId || null,
            viewerCount: s.viewerCount || 0,
            peakViewers: s.peakViewers || 0,
            startedAt: s.startedAt || null,
            streamType: s.streamType || 'PUBLIC',
            score: 0,
            bucket: s.status === 'LIVE' ? 'live_now' : 'for_you',
          });
        }
      }

      // Deduplicate by creatorId
      const seen = new Set<string>();
      const deduped = feedItems.filter(item => {
        if (seen.has(item.creatorId)) return false;
        seen.add(item.creatorId);
        return true;
      });

      setItems(deduped);
    }).finally(() => setLoading(false));
  }, []);

  // Snap scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const els = container.querySelectorAll('[data-index]');
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // Track view duration when active item changes
  useEffect(() => {
    if (items.length === 0) return;
    const item = items[activeIndex];
    if (!item) return;
    trackEvent(item.creatorId, 'impression', { category: item.category });
    return trackViewDuration(item.creatorId, item.streamId || undefined);
  }, [activeIndex, items, trackEvent, trackViewDuration]);

  const activeItem = items[activeIndex];

  // Loading state
  if (loading) {
    return (
      <>
        <Head><title>Dress Me</title></Head>
        <div className="fixed inset-0 bg-surface-dark flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium animate-pulse">Loading your feed...</p>
          </div>
        </div>
      </>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <>
        <Head><title>Dress Me</title></Head>
        <div className="fixed inset-0 bg-surface-dark flex flex-col items-center justify-center text-center px-8">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
            <Radio className="w-10 h-10 text-brand-500/50" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">No streams yet</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs">Be the first to go live and start building your audience</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/become-creator')}
            className="btn-glow flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Become a Creator
          </motion.button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dress Me</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      {/* ─── Full-Screen Snap Feed ─── */}
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, index) => (
          <FeedSlide
            key={`${item.creatorId}-${index}`}
            item={item}
            index={index}
            isActive={index === activeIndex}
            isLiked={!!liked[item.creatorId]}
            onLike={() => {
              setLiked(prev => ({ ...prev, [item.creatorId]: !prev[item.creatorId] }));
              if (!liked[item.creatorId]) trackEvent(item.creatorId, 'like', undefined, item.streamId || undefined);
            }}
            onGift={() => setShowGifts(true)}
            showChat={showChat}
            onToggleChat={() => setShowChat(!showChat)}
          />
        ))}
      </div>

      {/* ─── Top Bar ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          {/* LIVE indicator */}
          <div className="flex items-center gap-2">
            {activeItem?.isLive && <AnimatedLiveBadge compact />}
          </div>

          {/* Following / For You toggle */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/30 backdrop-blur-md rounded-full p-1">
            <button
              onClick={() => setTab('following')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === 'following' ? 'bg-white/15 text-white' : 'text-white/50'
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setTab('for_you')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === 'for_you' ? 'bg-white/15 text-white' : 'text-white/50'
              }`}
            >
              For You
            </button>
          </div>

          {/* Search */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/streams')}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-white/70" />
          </motion.button>
        </div>
      </div>

      {/* ─── Bottom Tab Bar ─── */}
      <BottomTabBar />

      {/* ─── Gift Sheet ─── */}
      <GlassBottomSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a Gift">
        {activeItem?.streamId && (
          <GiftPanel streamId={activeItem.streamId} onClose={() => setShowGifts(false)} />
        )}
      </GlassBottomSheet>
    </>
  );
}

/* ─── Feed Slide (Full Screen) ────────────────────── */
function FeedSlide({
  item,
  index,
  isActive,
  isLiked,
  onLike,
  onGift,
  showChat,
  onToggleChat,
}: {
  item: FeedCreator;
  index: number;
  isActive: boolean;
  isLiked: boolean;
  onLike: () => void;
  onGift: () => void;
  showChat: boolean;
  onToggleChat: () => void;
}) {
  const router = useRouter();

  return (
    <div
      data-index={index}
      className="relative w-full h-[100dvh] snap-start snap-always flex-shrink-0"
    >
      {/* Video / thumbnail */}
      <div className="absolute inset-0">
        {item.muxPlaybackId && isActive ? (
          <MuxPlayer
            playbackId={item.muxPlaybackId}
            streamType={item.isLive ? 'live' : 'on-demand'}
            autoPlay={isActive ? 'muted' : false}
            muted
            playsInline
            loop={!item.isLive}
            style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
            primaryColor="#FF4FA3"
            accentColor="#7C5CFF"
          />
        ) : item.muxPlaybackId ? (
          <img
            src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=5&width=720&height=1280&fit_mode=crop`}
            alt={item.streamTitle || ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-950 via-charcoal to-black flex items-center justify-center">
            <Shirt className="w-20 h-20 text-white/5" />
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-52 z-30">
        <FloatingActions
          liked={isLiked}
          likeCount={item.peakViewers}
          onLike={onLike}
          onComment={onToggleChat}
          onGift={onGift}
          showFollow
        />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-20 safe-area-pb">
        {/* Creator info */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`rounded-full overflow-hidden flex-shrink-0 ${item.isLive ? 'ring-creator p-[2px]' : ''}`}>
            <div className={`${item.isLive ? 'w-10 h-10' : 'w-11 h-11'} rounded-full overflow-hidden bg-brand-500/20`}>
              {item.avatarUrl ? (
                <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-400">
                  {item.displayName.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-bold text-shadow">@{item.username}</p>
            <p className="text-white/50 text-xs">{item.displayName}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all"
          >
            Follow
          </motion.button>
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-base text-shadow mb-1">
          {item.streamTitle || 'Untitled Stream'}
        </h3>

        {/* Tags */}
        {item.category && (
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 text-[10px] font-medium">
              #{item.category}
            </span>
            {item.isLive && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 text-[10px] font-medium">
                #live
              </span>
            )}
          </div>
        )}

        {/* Join Live CTA */}
        {item.streamId && item.isLive && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/stream/${item.streamId}`)}
            className="w-full py-3 rounded-2xl bg-brand-500/90 backdrop-blur-sm text-white text-sm font-bold flex items-center justify-center gap-2 shadow-glow mb-3 hover:bg-brand-500 transition-all"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Join Live
          </motion.button>
        )}

        {item.streamId && !item.isLive && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/stream/${item.streamId}`)}
            className="w-full py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-bold flex items-center justify-center gap-2 mb-3 hover:bg-white/15 transition-all"
          >
            Watch Stream
          </motion.button>
        )}

        {/* Chat overlay */}
        <AnimatePresence>
          {showChat && item.streamId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-32 overflow-hidden"
            >
              <ChatOverlay streamId={item.streamId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Bottom Tab Bar (inside full-screen feed) ────── */
function BottomTabBar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div className="bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2">
        <div className="max-w-[630px] mx-auto flex items-center justify-around">
          <TabBtn href="/" label="Home" active />
          <TabBtn href="/streams" label="Discover" />
          <TabBtn href="/create" label="Create" highlight />
          <TabBtn href="/giveaways" label="Rewards" />
          <TabBtn href={user ? '/profile' : '/auth/login'} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function TabBtn({ href, label, active, highlight }: { href: string; label: string; active?: boolean; highlight?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-0.5 py-1 ${active ? 'text-white' : 'text-white/40'}`}>
      {highlight ? (
        <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center -mt-2">
          <span className="text-white text-lg font-bold">+</span>
        </div>
      ) : (
        <div className="w-5 h-5" />
      )}
      <span className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
    </Link>
  );
}
