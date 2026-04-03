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
import { ReportSheet } from '@/components/ui/ReportSheet';
import { ShareSheet } from '@/components/ui/ShareSheet';
import { StoryRow } from '@/features/stories/StoryRow';
import { Search, Shirt, Sparkles, Radio, Home as HomeIcon, Film, Play, User } from 'lucide-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FeedItem {
  id: string;
  type: 'stream' | 'reel';
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  muxPlaybackId: string | null;
  isLive: boolean;
  streamId: string | null;
  viewerCount: number;
  likesCount: number;
  commentsCount: number;
}

type FeedTab = 'for_you' | 'following';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('for_you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch personalized feed
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    fetch(`${API_URL}/api/feed/personalized`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const combined: FeedItem[] = [];

        // Live streams first
        for (const s of (data.liveNow || [])) {
          combined.push({
            id: s.id,
            type: 'stream',
            creatorId: s.creatorId,
            username: s.creator?.user?.username || 'creator',
            displayName: s.creator?.user?.displayName || 'Creator',
            avatarUrl: s.creator?.user?.avatarUrl || null,
            title: s.title,
            caption: s.description,
            hashtags: [],
            muxPlaybackId: s.muxPlaybackId,
            isLive: true,
            streamId: s.id,
            viewerCount: s.viewerCount || 0,
            likesCount: s.peakViewers || 0,
            commentsCount: 0,
          });
        }

        // For You reels
        for (const r of (data.forYou || [])) {
          combined.push({
            id: r.id,
            type: 'reel',
            creatorId: r.creatorId,
            username: r.creator?.username || 'creator',
            displayName: r.creator?.displayName || 'Creator',
            avatarUrl: r.creator?.avatarUrl || null,
            title: null,
            caption: r.caption,
            hashtags: r.hashtags || [],
            muxPlaybackId: r.muxPlaybackId,
            isLive: false,
            streamId: null,
            viewerCount: r.viewsCount || 0,
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
          });
        }

        // Fallback: fetch raw streams if no personalized content
        if (combined.length === 0) {
          return fetch(`${API_URL}/api/streams?status=LIVE&limit=20`)
            .then(r => r.ok ? r.json() : { streams: [] })
            .then(liveData => {
              for (const s of (liveData.streams || [])) {
                combined.push({
                  id: s.id,
                  type: 'stream',
                  creatorId: s.creatorId || s.creator?.id || '',
                  username: s.creator?.user?.username || 'creator',
                  displayName: s.creator?.user?.displayName || 'Creator',
                  avatarUrl: s.creator?.user?.avatarUrl || null,
                  title: s.title,
                  caption: s.description,
                  hashtags: [],
                  muxPlaybackId: s.muxPlaybackId,
                  isLive: s.status === 'LIVE',
                  streamId: s.id,
                  viewerCount: s.viewerCount || 0,
                  likesCount: s.peakViewers || 0,
                  commentsCount: 0,
                });
              }
              setItems(combined);
            });
        }

        setItems(combined);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

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

  // Track engagement signal
  useEffect(() => {
    if (items.length === 0) return;
    const item = items[activeIndex];
    if (!item) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/feed/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contentId: item.id,
        contentType: item.type,
        creatorId: item.creatorId,
        event: 'view',
        watchTimeMs: 3000,
      }),
    }).catch(() => {});
  }, [activeIndex, items]);

  const activeItem = items[activeIndex];

  if (loading) {
    return (
      <>
        <Head><title>Dress Me</title></Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Head><title>Dress Me</title></Head>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center px-8">
          <Radio className="w-16 h-16 text-brand-500/30 mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">No content yet</h2>
          <p className="text-gray-500 text-sm mb-6">Be the first to go live or create a reel</p>
          <button onClick={() => router.push('/become-creator')} className="px-6 py-3 rounded-xl gradient-premium text-white text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Become a Creator
          </button>
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

      {/* ─── Top Header ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 safe-area-pt">
        {/* Stories */}
        <div className="bg-gradient-to-b from-black/90 via-black/60 to-transparent">
          <StoryRow />

          {/* Following / For You toggle */}
          <div className="flex items-center justify-center pb-2">
            <div className="flex items-center gap-0 bg-black/30 backdrop-blur-md rounded-full p-0.5">
              <button
                onClick={() => setTab('following')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === 'following' ? 'bg-white/15 text-white' : 'text-white/40'
                }`}
              >
                Following
              </button>
              <button
                onClick={() => setTab('for_you')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === 'for_you' ? 'bg-white/15 text-white' : 'text-white/40'
                }`}
              >
                For You
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/search')}
              className="absolute right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ─── Full-Screen Snap Feed ─── */}
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            data-index={index}
            className="relative w-full h-[100dvh] snap-start snap-always flex-shrink-0"
          >
            {/* Video */}
            <div className="absolute inset-0 z-0">
              {item.muxPlaybackId && index === activeIndex ? (
                <MuxPlayer
                  playbackId={item.muxPlaybackId}
                  streamType={item.isLive ? 'live' : 'on-demand'}
                  autoPlay={index === activeIndex ? 'muted' : false}
                  playsInline
                  loop={!item.isLive}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
                  primaryColor="#ec4899"
                  accentColor="#8b5cf6"
                />
              ) : item.muxPlaybackId ? (
                <img
                  src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=2&width=720&height=1280&fit_mode=crop`}
                  alt=""
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
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </div>

            {/* Right action rail */}
            <div className="absolute right-3 bottom-48 z-30">
              <FloatingActions
                liked={!!liked[item.id]}
                likeCount={item.likesCount}
                onLike={() => {
                  setLiked(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                  const token = localStorage.getItem('token');
                  if (token) {
                    fetch(`${API_URL}/api/feed/event`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ contentId: item.id, contentType: item.type, creatorId: item.creatorId, event: 'like' }),
                    }).catch(() => {});
                  }
                }}
                onComment={() => setShowChat(!showChat)}
                onGift={() => setShowGifts(true)}
                onShare={() => setShowShare(true)}
                onMore={() => setShowReport(true)}
                showFollow
              />
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-20 safe-area-pb">
              {/* Creator */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`rounded-full overflow-hidden flex-shrink-0 ${item.isLive ? 'ring-2 ring-red-500 p-[2px]' : ''}`}>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/40">
                        {item.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-bold">@{item.username}</p>
                    {item.isLive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">LIVE</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs truncate">{item.displayName}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    if (token) {
                      fetch(`${API_URL}/api/feed/event`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ contentId: item.id, contentType: item.type, creatorId: item.creatorId, event: 'follow' }),
                      }).catch(() => {});
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-brand-500 text-white text-xs font-bold"
                >
                  Follow
                </motion.button>
              </div>

              {/* Title/caption */}
              {(item.title || item.caption) && (
                <p className="text-white text-sm font-medium mb-1 line-clamp-2 text-shadow">
                  {item.title || item.caption}
                </p>
              )}

              {/* Hashtags */}
              {item.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.hashtags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-brand-400 text-xs font-medium">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Join Live CTA */}
              {item.isLive && item.streamId && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/stream/${item.streamId}`)}
                  className="w-full py-2.5 rounded-xl bg-brand-500/90 backdrop-blur-sm text-white text-sm font-bold flex items-center justify-center gap-2 mb-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Join Live — {item.viewerCount} watching
                </motion.button>
              )}

              {/* Chat */}
              <AnimatePresence>
                {showChat && item.streamId && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-28 overflow-hidden"
                  >
                    <ChatOverlay streamId={item.streamId} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Bottom Tab Bar ─── */}
      <BottomNav />

      {/* Sheets */}
      <GlassBottomSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a Gift">
        {activeItem?.streamId && <GiftPanel streamId={activeItem.streamId} onClose={() => setShowGifts(false)} />}
      </GlassBottomSheet>
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} streamId={activeItem?.streamId || undefined} creatorName={activeItem?.username} title={activeItem?.title || undefined} />
      <ReportSheet open={showReport} onClose={() => setShowReport(false)} targetStreamId={activeItem?.streamId || undefined} targetName={activeItem?.username} />
    </>
  );
}

function BottomNav() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) try { setUser(JSON.parse(s)); } catch {}
  }, []);

  const path = router.pathname;
  const tabs = [
    { href: '/', icon: HomeIcon, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/reels', icon: Film, label: 'Reels' },
    { href: '/streams', icon: Play, label: 'Live' },
    { href: user ? '/profile' : '/auth/login', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div className="bg-black/90 backdrop-blur-md border-t border-white/5">
        <div className="max-w-[630px] mx-auto flex items-center justify-around h-12">
          {tabs.map(t => {
            const active = path === t.href;
            return (
              <Link key={t.href} href={t.href} className="flex flex-col items-center gap-0.5 py-1 min-w-[48px]">
                <t.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white/30'}`} />
                <span className={`text-[9px] font-semibold ${active ? 'text-white' : 'text-white/30'}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
