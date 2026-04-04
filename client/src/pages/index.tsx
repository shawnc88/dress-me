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

    async function loadFeed() {
      const combined: FeedItem[] = [];

      // Try personalized feed first
      try {
        const res = await fetch(`${API_URL}/api/feed/personalized`, { headers });
        if (res.ok) {
          const data = await res.json();
          for (const s of (data.liveNow || [])) {
            combined.push({
              id: s.id, type: 'stream', creatorId: s.creatorId,
              username: s.creator?.user?.username || 'creator',
              displayName: s.creator?.user?.displayName || 'Creator',
              avatarUrl: s.creator?.user?.avatarUrl || null,
              title: s.title, caption: s.description, hashtags: [],
              muxPlaybackId: s.muxPlaybackId, isLive: true, streamId: s.id,
              viewerCount: s.viewerCount || 0, likesCount: s.peakViewers || 0, commentsCount: 0,
            });
          }
          for (const r of (data.forYou || [])) {
            combined.push({
              id: r.id, type: 'reel', creatorId: r.creatorId,
              username: r.creator?.username || 'creator',
              displayName: r.creator?.displayName || 'Creator',
              avatarUrl: r.creator?.avatarUrl || null,
              title: null, caption: r.caption, hashtags: r.hashtags || [],
              muxPlaybackId: r.muxPlaybackId, isLive: false, streamId: null,
              viewerCount: r.viewsCount || 0, likesCount: r.likesCount || 0, commentsCount: r.commentsCount || 0,
            });
          }
        }
      } catch {}

      // Fallback: always try streams if no content yet
      if (combined.length === 0) {
        try {
          const [liveRes, scheduledRes] = await Promise.all([
            fetch(`${API_URL}/api/streams?status=LIVE&limit=20`),
            fetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`),
          ]);
          const liveData = liveRes.ok ? await liveRes.json() : { streams: [] };
          const schedData = scheduledRes.ok ? await scheduledRes.json() : { streams: [] };
          for (const s of [...(liveData.streams || []), ...(schedData.streams || [])]) {
            combined.push({
              id: s.id, type: 'stream',
              creatorId: s.creatorId || s.creator?.id || '',
              username: s.creator?.user?.username || 'creator',
              displayName: s.creator?.user?.displayName || 'Creator',
              avatarUrl: s.creator?.user?.avatarUrl || null,
              title: s.title, caption: s.description, hashtags: [],
              muxPlaybackId: s.muxPlaybackId,
              isLive: s.status === 'LIVE', streamId: s.id,
              viewerCount: s.viewerCount || 0, likesCount: s.peakViewers || 0, commentsCount: 0,
            });
          }
        } catch {}
      }

      // Deduplicate
      const seen = new Set<string>();
      const deduped = combined.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setItems(deduped);
      setLoading(false);
    }

    loadFeed();
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

  // Track engagement signal — debounced, tracks real watch time
  const watchStartRef = useRef(Date.now());
  const trackedRef = useRef(new Set<string>());

  useEffect(() => {
    watchStartRef.current = Date.now();

    // Send watch time for previous item on cleanup
    return () => {
      const watchTimeMs = Date.now() - watchStartRef.current;
      const item = items[activeIndex];
      if (!item || watchTimeMs < 1000) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      // Only send view event once per item per session
      if (trackedRef.current.has(item.id)) return;
      trackedRef.current.add(item.id);

      fetch(`${API_URL}/api/feed/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contentId: item.id,
          contentType: item.type,
          creatorId: item.creatorId,
          event: watchTimeMs < 2000 ? 'skip' : 'view',
          watchTimeMs,
        }),
      }).catch(() => {});
    };
  }, [activeIndex]); // items intentionally excluded to avoid stale closure issues

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
          <Radio className="w-16 h-16 text-white/10 mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">No streams right now</h2>
          <p className="text-gray-500 text-sm mb-6">Check back soon or explore reels and creators</p>
          <div className="flex gap-3">
            <button onClick={() => router.push('/reels')} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium">
              Browse Reels
            </button>
            <button onClick={() => router.push('/search')} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium">
              Discover
            </button>
          </div>
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
          <div
            key={`${item.id}-${index}`}
            data-index={index}
            className="relative w-full h-[100dvh] snap-start snap-always flex-shrink-0"
          >
            {/* Video — full bleed */}
            <div className="absolute inset-0">
              {item.muxPlaybackId && Math.abs(index - activeIndex) <= 1 ? (
                <MuxPlayer
                  playbackId={item.muxPlaybackId}
                  streamType={item.isLive ? 'live' : 'on-demand'}
                  autoPlay={index === activeIndex ? 'muted' : false}
                  playsInline
                  loop={!item.isLive}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' } as any}
                />
              ) : item.muxPlaybackId ? (
                <img
                  src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=2&width=720&height=1280&fit_mode=crop`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-black" />
              )}
            </div>

            {/* Gradient overlays — TikTok-exact */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Right action rail — TikTok spacing */}
            <div className="absolute right-2 bottom-[160px] z-30">
              <FloatingActions
                liked={!!liked[item.id]}
                likeCount={item.likesCount}
                commentCount={item.commentsCount}
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

            {/* Bottom info — TikTok-exact layout */}
            <div className="absolute bottom-[72px] left-0 right-[68px] z-20 px-4 safe-area-pb">
              {/* Username + Follow */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-white text-[15px] font-extrabold text-shadow">@{item.username}</p>
                {item.isLive && (
                  <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-red-500 text-white leading-none">LIVE</span>
                )}
              </div>

              {/* Caption */}
              {(item.title || item.caption) && (
                <p className="text-white text-[13px] leading-[18px] mb-2 line-clamp-2 text-shadow">
                  {item.title || item.caption}
                </p>
              )}

              {/* Hashtags */}
              {item.hashtags.length > 0 && (
                <p className="text-white/90 text-[13px] mb-2 text-shadow">
                  {item.hashtags.slice(0, 4).map(tag => `#${tag}`).join(' ')}
                </p>
              )}

              {/* Join Live CTA */}
              {item.isLive && item.streamId && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/stream/${item.streamId}`)}
                  className="w-full py-2.5 rounded-lg bg-red-500/90 text-white text-[13px] font-bold flex items-center justify-center gap-2 mb-3"
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Join Live &middot; {item.viewerCount} watching
                </motion.button>
              )}

              {/* Music bar — TikTok style */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] text-white/60">&#9835;</span>
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-white/50 text-[12px] whitespace-nowrap">
                    Original Sound &mdash; {item.displayName}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 border border-white/20">
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-violet-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Top Header — floats over feed ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 safe-area-pt pointer-events-none">
        <div className="pointer-events-auto">
          <StoryRow />
        </div>
        <div className="flex items-center justify-center py-2 relative">
          <div className="flex items-center pointer-events-auto">
            <button
              onClick={() => setTab('following')}
              className={`px-4 py-1 text-[15px] font-bold transition-all ${
                tab === 'following' ? 'text-white' : 'text-white/40'
              }`}
            >
              Following
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={() => setTab('for_you')}
              className={`px-4 py-1 text-[15px] font-bold transition-all ${
                tab === 'for_you' ? 'text-white' : 'text-white/40'
              }`}
            >
              For You
            </button>
          </div>
          {/* Active indicator line */}
          <motion.div
            className="absolute bottom-0 h-[2px] w-8 bg-white rounded-full"
            animate={{ x: tab === 'following' ? -40 : 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/search')}
            className="absolute right-4 pointer-events-auto"
          >
            <Search className="w-5 h-5 text-white drop-shadow-lg" />
          </motion.button>
        </div>
      </div>

      {/* ─── Bottom Tab Bar — TikTok style ─── */}
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div className="bg-black border-t border-white/[0.08]">
        <div className="flex items-center justify-around h-[50px]">
          <NavTab href="/" label="Home" active={path === '/'}>
            <HomeIcon className="w-6 h-6" strokeWidth={path === '/' ? 2.5 : 1.5} />
          </NavTab>
          <NavTab href="/search" label="Discover" active={path === '/search'}>
            <Search className="w-6 h-6" strokeWidth={path === '/search' ? 2.5 : 1.5} />
          </NavTab>
          {/* Center create button — TikTok style */}
          <Link href="/create" className="flex items-center justify-center -mt-2">
            <div className="w-11 h-8 rounded-lg bg-white flex items-center justify-center relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-l-lg" />
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-red-500 to-pink-500 rounded-r-lg" />
              <span className="text-black text-xl font-light relative z-10 leading-none">+</span>
            </div>
          </Link>
          <NavTab href="/streams" label="Live" active={path === '/streams'}>
            <Play className="w-6 h-6" strokeWidth={path === '/streams' ? 2.5 : 1.5} />
          </NavTab>
          <NavTab href={user ? '/profile' : '/auth/login'} label="Profile" active={path === '/profile'}>
            {user?.avatarUrl ? (
              <div className={`w-6 h-6 rounded-full overflow-hidden ${path === '/profile' ? 'ring-1 ring-white' : ''}`}>
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <User className="w-6 h-6" strokeWidth={path === '/profile' ? 2.5 : 1.5} />
            )}
          </NavTab>
        </div>
      </div>
    </div>
  );
}

function NavTab({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-[2px] min-w-[52px]">
      <div className={active ? 'text-white' : 'text-white/40'}>{children}</div>
      <span className={`text-[10px] leading-none ${active ? 'text-white font-semibold' : 'text-white/40 font-normal'}`}>{label}</span>
    </Link>
  );
}
