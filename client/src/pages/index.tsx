import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { GlassBottomSheet } from '@/components/ui/GlassBottomSheet';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { ShareSheet } from '@/components/ui/ShareSheet';
import { StoryRow } from '@/features/stories/StoryRow';
import { Search, Home as HomeIcon, Play, User } from 'lucide-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

/* Lazy so three.js never lands in the feed's first-load JS — aurora only shows on LOADING/EMPTY. */
const AuroraBackdrop = dynamic(() => import('@/components/ui/AuroraBackdrop'), { ssr: false });

/* Couture Nightfall — lazy WebGL gem, only mounted on LOADING/EMPTY (never behind live video). */
const FloatingGem = dynamic(
  () => import('@/components/3d/couture').then((m) => m.FloatingGem),
  { ssr: false }
);

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
  const reduceMotion = useReducedMotion();
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

  /* ─── LOADING — cinematic couture curtain (3D allowed here: no video yet) ─── */
  if (loading) {
    return (
      <>
        <Head><title>Be With Me</title></Head>
        <div className="fixed inset-0 nightfall-canvas grain bg-ink-950 overflow-hidden flex items-center justify-center">
          <AuroraBackdrop variant="auto" intensity="subtle" />
          <div className="relative z-10 flex flex-col items-center pointer-events-none px-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.42em] text-white/35 mb-4 animate-blur-in">
              The room is opening
            </p>
            <h1 className="editorial text-6xl text-white leading-[1.02] mb-10 animate-rise">
              Be <span className="text-couture-gold">With</span> Me
            </h1>
            {/* Elegant hairline loader — a gold light sweeping a hairline, not a spinner */}
            <div className="relative h-px w-44 bg-white/10 overflow-hidden rounded-full">
              {reduceMotion ? (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-300/80 to-transparent" />
              ) : (
                <motion.div
                  className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-gold-300 to-transparent"
                  animate={{ x: [-64, 176] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ─── EMPTY — a true couture hero moment (3D allowed here: no video) ─── */
  if (items.length === 0) {
    return (
      <>
        <Head><title>Be With Me</title></Head>
        <div className="fixed inset-0 nightfall-canvas grain bg-ink-950 overflow-hidden flex flex-col items-center justify-center text-center px-8 safe-area-pt safe-area-pb">
          {/* CSS aurora so the gem stays the single WebGL scene on this view */}
          <AuroraBackdrop variant="css" intensity="subtle" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="pointer-events-none mb-2 animate-blur-in">
              <FloatingGem size={170} tone="gold" intensity="full" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.42em] text-white/40 mb-3 animate-rise">
              Between shows
            </p>
            <h2 className="editorial text-5xl text-white leading-[1.02] mb-4 animate-rise">
              The stage is <span className="text-couture-gold">dark</span>,<br />for now
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-[280px] mb-9">
              No one is live at this moment. Wander the reels or find a creator worth waiting for.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/reels')}
                className="btn-couture min-h-[44px] text-sm"
              >
                Browse Reels
              </button>
              <button
                onClick={() => router.push('/search')}
                className="btn-couture-ghost min-h-[44px] text-sm"
              >
                Discover
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Be With Me</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      {/* ─── Full-Screen Snap Feed — video is the star; chrome only (GUARDRAIL #1) ─── */}
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
                  {...(item.isLive ? { targetLiveWindow: 6 } : {})}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' } as any}
                />
              ) : item.muxPlaybackId ? (
                <img
                  src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=2&width=720&height=1280&fit_mode=crop`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950" />
              )}
            </div>

            {/* Cinematic scrims — deep ink gradients for editorial legibility */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-ink-950/75 via-ink-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-[26rem] bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent" />
              {/* whisper of side vignette so the action rail reads on bright footage */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950/35 to-transparent" />
            </div>

            {/* Right action rail — TikTok thumb-reach ergonomics, couture polish */}
            <div className="absolute right-2 bottom-[172px] z-30">
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

            {/* Bottom info — editorial hierarchy: name as a headline, handle as a byline */}
            <div className="absolute bottom-[86px] left-0 right-[68px] z-20 px-4 safe-area-pb">
              {/* Creator — editorial display name over rose-gold handle */}
              <p className="editorial text-[24px] text-white text-shadow-lg mb-1.5 truncate">
                {item.displayName}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gold-200 text-[13px] font-semibold tracking-wide text-shadow">
                  @{item.username}
                </p>
                {item.isLive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-live/20 border border-live/50 backdrop-blur-md shadow-glow-live leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.18em] text-white">LIVE</span>
                  </span>
                )}
              </div>

              {/* Caption */}
              {(item.title || item.caption) && (
                <p className="text-white/85 text-[13px] leading-[19px] mb-2 line-clamp-2 text-shadow">
                  {item.title || item.caption}
                </p>
              )}

              {/* Hashtags — rose-gold whisper */}
              {item.hashtags.length > 0 && (
                <p className="text-gold-200/80 text-[12px] tracking-wide mb-2 text-shadow">
                  {item.hashtags.slice(0, 4).map(tag => `#${tag}`).join('  ')}
                </p>
              )}

              {/* Join Live CTA — couture glass, pink→violet, unmistakably tappable */}
              {item.isLive && item.streamId && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/stream/${item.streamId}`)}
                  className="relative w-full min-h-[44px] py-3 rounded-2xl overflow-hidden bg-gradient-to-r from-brand-500/90 via-brand-600/85 to-violet-deep/85 backdrop-blur-md border border-white/20 shadow-glow text-white text-[13px] font-bold flex items-center justify-center gap-2 mb-3"
                >
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-200/70 to-transparent pointer-events-none" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="editorial text-[15px]">Join Live</span>
                  <span className="text-white/70 font-medium">&middot; {item.viewerCount} watching</span>
                </motion.button>
              )}

              {/* Sound bar — hairline glass, gold-framed avatar */}
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] text-gold-200/80">&#9835;</span>
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-white/45 text-[12px] whitespace-nowrap tracking-wide">
                    Original Sound &mdash; {item.displayName}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 border border-gold-300/40 shadow-gold-sm bg-ink-800">
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-violet-deep" />
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
              className={`px-4 py-2 min-h-[44px] text-[15px] tracking-wide transition-all duration-300 ${
                tab === 'following'
                  ? 'text-white font-bold text-shadow'
                  : 'text-white/40 font-medium'
              }`}
            >
              Following
            </button>
            <div className="w-px h-3.5 bg-gradient-to-b from-transparent via-gold-300/50 to-transparent mx-1" />
            <button
              onClick={() => setTab('for_you')}
              className={`px-4 py-2 min-h-[44px] text-[15px] tracking-wide transition-all duration-300 ${
                tab === 'for_you'
                  ? 'text-white font-bold text-shadow'
                  : 'text-white/40 font-medium'
              }`}
            >
              For You
            </button>
          </div>
          {/* Active indicator — rose-gold hairline, same spring behavior */}
          <motion.div
            className="absolute bottom-0 h-[2px] w-8 rounded-full bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400 shadow-gold-sm pointer-events-none"
            animate={{ x: tab === 'following' ? -40 : 40 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 300, damping: 25 }
            }
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/search')}
            className="absolute right-3 pointer-events-auto w-11 h-11 flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-white drop-shadow-lg" />
          </motion.button>
        </div>
      </div>

      {/* ─── Bottom Tab Bar — floating couture glass ─── */}
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
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) try { setUser(JSON.parse(s)); } catch {}
  }, []);

  const path = router.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-pb pointer-events-none">
      <div className="pointer-events-auto relative mx-3 mb-2 rounded-3xl border border-white/10 bg-ink-900/75 backdrop-blur-2xl shadow-couture overflow-hidden no-select">
        {/* rose-gold hairline crown */}
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent pointer-events-none" />
        <div className="flex items-center justify-around h-[58px] px-1">
          <NavTab href="/" label="Home" active={path === '/'}>
            <HomeIcon className="w-6 h-6" strokeWidth={path === '/' ? 2.2 : 1.5} />
          </NavTab>
          <NavTab href="/search" label="Discover" active={path === '/search'}>
            <Search className="w-6 h-6" strokeWidth={path === '/search' ? 2.2 : 1.5} />
          </NavTab>
          {/* Center create — couture jewel button (concept preserved) */}
          <Link href="/create" className="flex items-center justify-center min-w-[52px] min-h-[44px]">
            <motion.div
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              className="relative w-12 h-9 -mt-1 rounded-xl overflow-hidden bg-gradient-to-r from-brand-500 via-brand-600 to-violet-deep shadow-glow border border-white/20 flex items-center justify-center"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-gold-200 to-gold-400" />
              <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-brand-300 to-brand-500" />
              <span className="text-white text-xl font-light relative z-10 leading-none">+</span>
            </motion.div>
          </Link>
          <NavTab href="/streams" label="Live" active={path === '/streams'}>
            <Play className="w-6 h-6" strokeWidth={path === '/streams' ? 2.2 : 1.5} />
          </NavTab>
          <NavTab href={user ? '/profile' : '/auth/login'} label="Profile" active={path === '/profile'}>
            {user?.avatarUrl ? (
              <div className={`w-6 h-6 rounded-full overflow-hidden ${path === '/profile' ? 'ring-1 ring-gold-300' : ''}`}>
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <User className="w-6 h-6" strokeWidth={path === '/profile' ? 2.2 : 1.5} />
            )}
          </NavTab>
        </div>
      </div>
    </div>
  );
}

function NavTab({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center gap-[3px] min-w-[52px] min-h-[44px]">
      {active && (
        <span className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-gold-300/[0.08] shadow-gold-sm pointer-events-none" />
      )}
      <div className={`relative transition-colors duration-300 ${active ? 'text-gold-200 drop-shadow-[0_0_8px_rgba(243,182,160,0.45)]' : 'text-white/40'}`}>
        {children}
      </div>
      <span className={`relative text-[10px] leading-none tracking-wide transition-colors duration-300 ${active ? 'text-gold-200 font-semibold' : 'text-white/40 font-normal'}`}>
        {label}
      </span>
    </Link>
  );
}
