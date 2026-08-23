import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, animate, useReducedMotion } from 'framer-motion';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { GlassBottomSheet } from '@/components/ui/GlassBottomSheet';
import { GiftPanel } from '@/components/video/GiftPanel';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { ShareSheet } from '@/components/ui/ShareSheet';
import { StoryRow } from '@/features/stories/StoryRow';
import { StudioHub } from '@/components/studio/StudioHub';
import { MessagesInboxPanel } from '@/components/messages/MessagesInboxPanel';
import { Search, Plus, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';

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
  videoUrl: string | null;
  musicTrackUrl?: string | null;
  isLive: boolean;
  streamId: string | null;
  viewerCount: number;
  likesCount: number;
  commentsCount: number;
}

type FeedTab = 'for_you' | 'following';

// Session-scoped feed cache: returning to Home paints the last feed instantly
// (no full-screen splash on every tab switch) while a fresh load runs behind it.
let feedCache: { tab: FeedTab; items: FeedItem[] } | null = null;

// Horizontal pages: 0 = Messages, 1 = Feed, 2 = Studio (IG structure).
const PAGE_MESSAGES = 0;
const PAGE_FEED = 1;
const PAGE_STUDIO = 2;

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
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  // Follow state for the action rail — was never passed in, so the Follow
  // button gave zero feedback forever. Hydrated once, optimistic after.
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetchWithTimeout(`${API_URL}/api/feed/following`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (Array.isArray(d?.following)) {
          setFollowedCreators(Object.fromEntries(d.following.map((id: string) => [id, true])));
        }
      })
      .catch(() => {});
  }, []);
  // Double-tap like on the video zone — same gesture vocabulary as the reels tab.
  const feedLastTapRef = useRef(0);
  function likeFeedItem(item: FeedItem) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    if (liked[item.id]) return; // double-tap only ever likes, never unlikes
    setLiked(prev => ({ ...prev, [item.id]: true }));
    if (item.type === 'reel') {
      fetch(`${API_URL}/api/reels/${item.id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    fetch(`${API_URL}/api/feed/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contentId: item.id, contentType: item.type, creatorId: item.creatorId, event: 'like' }),
    }).catch(() => {});
  }
  // Streams that failed to play (e.g. marked LIVE but not actually broadcasting).
  // We fall back to the poster + "starting soon" instead of Mux's stuck
  // "video is not currently available" screen — which reads as a frozen app.
  const [videoOffline, setVideoOffline] = useState<Record<string, boolean>>({});
  // Tracks which items have actually reached playback (via onPlaying) so a live
  // stream that never starts (idle, no error event) can be timed out to offline.
  const videoPlayingRef = useRef<Record<string, boolean>>({});

  /* ─── The home pager ───────────────────────────────────────────────────
     The old home was a native momentum scroller (snap-y) — that's where the
     iOS rubber-band came from, and the "swipe to studio" was a bare
     router.push with no visual slide. Both are replaced by ONE controlled
     pager: transforms driven from touch, spring-snapped on release.
     - Vertical: one video per swipe (TikTok paging), zero native scroll.
     - Horizontal: Messages ← Feed → Studio, the whole screen follows the
       finger (IG structure). */
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // center panel — applyFeedSound scope
  const [page, setPage] = useState(PAGE_FEED);
  // Side panels mount on first interaction so Messages doesn't fetch on boot.
  const [sideMounted, setSideMounted] = useState(false);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const vpRef = useRef(vp); vpRef.current = vp;
  const pageRef = useRef(page); pageRef.current = page;
  const itemsLenRef = useRef(items.length); itemsLenRef.current = items.length;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const yAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  // Release velocity (px/s) handed to the next snap spring.
  const flingRef = useRef({ vx: 0, vy: 0 });

  const settleX = useCallback((p: number, vel = 0) => {
    xAnimRef.current?.stop();
    xAnimRef.current = animate(x, -p * vpRef.current.w, reduceMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 360, damping: 40, velocity: vel, restDelta: 0.5 });
  }, [x, reduceMotion]);
  const settleY = useCallback((idx: number, vel = 0) => {
    yAnimRef.current?.stop();
    yAnimRef.current = animate(y, -idx * vpRef.current.h, reduceMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 420, damping: 46, velocity: vel, restDelta: 0.5 });
  }, [y, reduceMotion]);

  // Measure the viewport; reposition instantly on resize/rotation.
  // `loading` MUST be a dependency: while the splash is up the pager div
  // doesn't exist, so a mount-only effect would never measure — leaving the
  // pager parked at x=0 (the Messages panel) instead of the feed.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      setVp(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
      x.set(-pageRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x, loading]);

  // Snap to the current page/index whenever they change (gesture releases,
  // header buttons, tab resets) — the spring carries the release velocity.
  useEffect(() => {
    if (!vp.w) return;
    settleX(page, flingRef.current.vx);
    flingRef.current.vx = 0;
  }, [page, vp.w, settleX]);
  useEffect(() => {
    if (!vp.h) return;
    settleY(activeIndex, flingRef.current.vy);
    flingRef.current.vy = 0;
  }, [activeIndex, vp.h, settleY]);

  const goToPage = useCallback((p: number) => {
    setSideMounted(true);
    setPage(prev => {
      if (prev === p) settleX(p);
      return p;
    });
  }, [settleX]);

  // Tapping the Home tab while already on home always lands on the feed —
  // never leaves you parked on the Messages/Studio panel.
  useEffect(() => {
    const onHomeTab = () => goToPage(PAGE_FEED);
    window.addEventListener('bwm:home-feed', onHomeTab);
    return () => window.removeEventListener('bwm:home-feed', onHomeTab);
  }, [goToPage]);

  // One gesture controller for both axes. touch-action CSS does the native
  // arbitration (feed panel: none; side panels keep their own vertical
  // scroll), so no preventDefault is ever needed.
  const gestureRef = useRef<{
    id: number; startX: number; startY: number; baseX: number; baseY: number;
    axis: 'x' | 'y' | 'skip' | null; exemptX: boolean;
    lastX: number; lastY: number; lastT: number; vx: number; vy: number;
  } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (!sideMounted) setSideMounted(true);
    if (e.touches.length !== 1) { gestureRef.current = null; return; }
    const t = e.touches[0];
    xAnimRef.current?.stop();
    yAnimRef.current?.stop();
    gestureRef.current = {
      id: t.identifier, startX: t.clientX, startY: t.clientY,
      baseX: x.get(), baseY: y.get(), axis: null,
      // Regions with their own horizontal scroll (story row) keep it.
      exemptX: !!(e.target as HTMLElement).closest('[data-pager-exempt-x]'),
      lastX: t.clientX, lastY: t.clientY, lastT: e.timeStamp, vx: 0, vy: 0,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gestureRef.current;
    if (!g || !vpRef.current.w) return;
    const t = Array.from(e.touches).find(tt => tt.identifier === g.id) || e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) g.axis = g.exemptX ? 'skip' : 'x';
      else if (pageRef.current === PAGE_FEED && itemsLenRef.current > 0) g.axis = 'y';
      else g.axis = 'skip'; // vertical motion on a side panel = its own scroll
    }
    const dt = Math.max(1, e.timeStamp - g.lastT);
    g.vx = (t.clientX - g.lastX) / dt;
    g.vy = (t.clientY - g.lastY) / dt;
    g.lastX = t.clientX; g.lastY = t.clientY; g.lastT = e.timeStamp;

    if (g.axis === 'x') {
      const { w } = vpRef.current;
      const min = -(PAGE_STUDIO) * w, max = 0;
      const raw = g.baseX + dx;
      let next = raw;
      if (raw > max) next = max + Math.min(60, (raw - max) / 4);
      if (raw < min) next = min - Math.min(60, (min - raw) / 4);
      x.set(next);
    } else if (g.axis === 'y') {
      const { h } = vpRef.current;
      const min = -(itemsLenRef.current - 1) * h, max = 0;
      const raw = g.baseY + dy;
      let next = raw;
      if (raw > max) next = max + Math.min(64, (raw - max) / 4);
      if (raw < min) next = min - Math.min(64, (min - raw) / 4);
      y.set(next);
    }
  }

  function onTouchEnd() {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    const { w, h } = vpRef.current;
    if (g.axis === 'x' && w) {
      const offset = x.get() + page * w;
      let target = page;
      if ((offset < -w * 0.22 || g.vx < -0.5) && offset < -24) target = Math.min(PAGE_STUDIO, page + 1);
      else if ((offset > w * 0.22 || g.vx > 0.5) && offset > 24) target = Math.max(PAGE_MESSAGES, page - 1);
      flingRef.current.vx = g.vx * 1000;
      if (target !== page) setPage(target);
      else settleX(page, g.vx * 1000);
    } else if (g.axis === 'y' && h && items.length > 0) {
      const offset = y.get() + activeIndex * h;
      let target = activeIndex;
      if ((offset < -h * 0.16 || g.vy < -0.55) && offset < -28) target = Math.min(items.length - 1, activeIndex + 1);
      else if ((offset > h * 0.16 || g.vy > 0.55) && offset > 28) target = Math.max(0, activeIndex - 1);
      flingRef.current.vy = g.vy * 1000;
      if (target !== activeIndex) setActiveIndex(target);
      else settleY(activeIndex, g.vy * 1000);
    } else {
      // Tap (or exempt region): if a touch interrupted a snap mid-flight,
      // finish the trip — never leave the pager parked between screens.
      settleX(page);
      if (page === PAGE_FEED && items.length > 0) settleY(activeIndex);
    }
  }

  // Desktop/web: wheel steps one video at a time, same as TikTok web.
  const wheelRef = useRef({ acc: 0, lockUntil: 0 });
  function onFeedWheel(e: React.WheelEvent) {
    if (pageRef.current !== PAGE_FEED || itemsLenRef.current === 0) return;
    const wl = wheelRef.current;
    if (e.timeStamp < wl.lockUntil) return;
    wl.acc += e.deltaY;
    if (wl.acc > 90) {
      wl.acc = 0; wl.lockUntil = e.timeStamp + 550;
      setActiveIndex(i => Math.min(itemsLenRef.current - 1, i + 1));
    } else if (wl.acc < -90) {
      wl.acc = 0; wl.lockUntil = e.timeStamp + 550;
      setActiveIndex(i => Math.max(0, i - 1));
    }
  }

  // Sound — the home feed used to be PERMANENTLY muted with no control at all
  // (hard `muted` on every player). One shared preference with the reels feed
  // (same localStorage key); autoplay policy forces a muted start, so the
  // unmute must come from a tap.
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    try { setSoundOn(localStorage.getItem('bewithme_sound') === 'on'); } catch {}
  }, []);
  const applyFeedSound = useCallback((on: boolean, activeIdx: number) => {
    const cards = containerRef.current?.querySelectorAll('[data-feed-idx]');
    cards?.forEach((el) => {
      const idx = Number(el.getAttribute('data-feed-idx'));
      const audible = on && idx === activeIdx;
      // Library-music reels: video stays muted forever, music carries the sound.
      const music = el.querySelector('audio[data-feed-music]') as HTMLAudioElement | null;
      const v = (el.querySelector('mux-player') as any)?.shadowRoot?.querySelector('video')
        || el.querySelector('video:not([data-feed-music])');
      if (music) {
        if (v) v.muted = true;
        music.muted = !audible;
        if (audible) { music.volume = 1; music.play().catch(() => {}); }
        else music.pause();
        return;
      }
      if (!v) return;
      v.muted = !audible;
      if (audible) { v.volume = 1; v.play().catch(() => {}); }
    });
  }, []);
  // Re-apply whenever the active card, the preference, or the horizontal page
  // changes — sliding to Messages/Studio silences the feed behind it.
  useEffect(() => {
    const t = setTimeout(() => applyFeedSound(soundOn && page === PAGE_FEED, activeIndex), 250);
    return () => clearTimeout(t);
  }, [soundOn, activeIndex, page, applyFeedSound]);
  function toggleFeedSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem('bewithme_sound', next ? 'on' : 'off'); } catch {}
    // Apply inside the tap gesture — iOS only honors unmute from a user action.
    applyFeedSound(next, activeIndex);
  }
  // Feed self-heal: when a refresh returns nothing (cold backend timing out),
  // retry with backoff instead of leaving a stale one-item cache pinned on
  // screen — that's the "home feed stuck on my last stream" failure.
  const [retryTick, setRetryTick] = useState(0);
  const retryCountRef = useRef(0);

  // Safety net: never let the launch spinner hang. Even if every boot fetch
  // stalls (e.g. a cold backend that never responds), force the app to render
  // after a hard cap so the reviewer/user always reaches the UI. App Store
  // Guideline 2.1(a): "activity indicator loads indefinitely" — this is the fix.
  useEffect(() => {
    const cap = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(cap);
  }, []);

  // Fetch personalized feed
  useEffect(() => {
    // Paint instantly from the session cache, then refresh in the background.
    const paintedFromCache = !!(feedCache && feedCache.tab === tab && feedCache.items.length > 0);
    if (paintedFromCache) {
      setItems(feedCache!.items);
      setLoading(false);
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    async function loadFeed() {
      const combined: FeedItem[] = [];

      // Try personalized feed first
      try {
        const res = await fetchWithTimeout(`${API_URL}/api/feed/personalized`, { headers });
        if (res.ok) {
          const data = await res.json();
          for (const s of (data.liveNow || [])) {
            combined.push({
              id: s.id, type: 'stream', creatorId: s.creatorId,
              username: s.creator?.user?.username || 'creator',
              displayName: s.creator?.user?.displayName || 'Creator',
              avatarUrl: s.creator?.user?.avatarUrl || null,
              title: s.title, caption: s.description, hashtags: [],
              muxPlaybackId: s.muxPlaybackId, videoUrl: null, isLive: true, streamId: s.id,
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
              muxPlaybackId: r.muxPlaybackId, videoUrl: r.videoUrl || null, isLive: false, streamId: null,
              musicTrackUrl: r.musicTrackUrl || null,
              viewerCount: r.viewsCount || 0, likesCount: r.likesCount || 0, commentsCount: r.commentsCount || 0,
            });
          }
        }
      } catch {}

      // Fallback: always try streams if no content yet
      if (combined.length === 0) {
        try {
          const [liveRes, scheduledRes] = await Promise.all([
            fetchWithTimeout(`${API_URL}/api/streams?status=LIVE&limit=20`),
            fetchWithTimeout(`${API_URL}/api/streams?status=SCHEDULED&limit=10`),
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
              muxPlaybackId: s.muxPlaybackId, videoUrl: null,
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

      // "Following" tab: scope the feed to creators the user actually follows
      // (previously this tab showed identical For-You content).
      let result = deduped;
      if (tab === 'following') {
        const token = localStorage.getItem('token');
        if (!token) {
          result = [];
        } else {
          try {
            const fr = await fetchWithTimeout(`${API_URL}/api/feed/following`, { headers });
            if (fr.ok) {
              const fd = await fr.json();
              const followed = new Set<string>(fd.following || []);
              result = deduped.filter(item => followed.has(item.creatorId));
            }
          } catch {}
        }
      }
      if (result.length > 0) {
        // Don't re-render (and yank the video mid-watch) when the refresh
        // returns the same list the cache already painted.
        const prev = paintedFromCache ? feedCache!.items : null;
        const unchanged =
          prev && prev.length === result.length && prev.every((c, i) => c.id === result[i].id);
        feedCache = { tab, items: result };
        if (!unchanged) setItems(result);
      } else if (!paintedFromCache) {
        // Empty refresh only wipes the screen if nothing is showing yet.
        setItems(result);
      }
      // A feed with ≤1 item almost always means the fetches timed out against
      // a cold backend — schedule another refresh so the feed fills itself in
      // instead of staying frozen until the user force-quits.
      if (result.length <= 1 && retryCountRef.current < 5) {
        retryCountRef.current += 1;
        setTimeout(() => setRetryTick(t => t + 1), 8000);
      } else if (result.length > 1) {
        retryCountRef.current = 0;
      }
      setLoading(false);
    }

    loadFeed();
  }, [tab, retryTick]);

  // If the list shrinks under the current position (block, tab switch race),
  // land back on the first card instead of a void.
  useEffect(() => {
    if (items.length > 0 && activeIndex >= items.length) setActiveIndex(0);
  }, [items.length, activeIndex]);

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

  // If the active item hasn't reached playback within 8s — an idle live stream
  // or a still-processing reel that never fires an error, just spins "video not
  // available" — treat it as offline so we show the branded fallback card
  // instead of a dead black buffer.
  useEffect(() => {
    const item = items[activeIndex];
    if (!item || (!item.muxPlaybackId && !item.videoUrl)) return;
    if (videoPlayingRef.current[item.id] || videoOffline[item.id]) return;
    const t = setTimeout(() => {
      if (!videoPlayingRef.current[item.id]) {
        setVideoOffline((p) => ({ ...p, [item.id]: true }));
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [activeIndex, items, videoOffline]);

  /* ─── LOADING — colorful celebration wash (pure CSS, no WebGL) ─── */
  if (loading) {
    return (
      <>
        <Head><title>Be With Me</title></Head>
        <div className="fixed inset-0 celebration-canvas grain bg-ink-950 overflow-hidden flex items-center justify-center">
          <div className="relative z-10 flex flex-col items-center pointer-events-none px-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.42em] text-white/40 mb-4 animate-blur-in">
              Getting the room ready
            </p>
            <h1 className="font-sans font-extrabold tracking-tightest text-6xl text-white leading-[1.02] mb-10 animate-rise">
              Be <span className="text-celebration">With</span> Me
            </h1>
            {/* Neon hairline loader — a multicolor light sweeping a hairline, not a spinner */}
            <div className="relative h-px w-44 bg-white/10 overflow-hidden rounded-full">
              {reduceMotion ? (
                <div className="absolute inset-0 gradient-celebration opacity-80" />
              ) : (
                <motion.div
                  className="absolute top-0 bottom-0 w-16 gradient-celebration"
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

  return (
    <>
      <Head>
        <title>Be With Me</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>

      {/* ─── The pager root — no native scroll anywhere on this screen, so
          iOS has nothing to rubber-band. All motion is spring-driven. ─── */}
      <div
        ref={rootRef}
        className="fixed inset-0 bg-black overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <motion.div style={{ x }} className="flex h-full will-change-transform">

          {/* ══ PAGE 0 — Messages (swipe right from the feed, IG-style) ══ */}
          <div className="relative w-screen h-full flex-shrink-0 overflow-hidden bg-ink-950">
            {sideMounted && (
              <div
                className="absolute inset-0 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ touchAction: 'pan-y' }}
              >
                <MessagesInboxPanel embedded onBack={() => goToPage(PAGE_FEED)} />
              </div>
            )}
          </div>

          {/* ══ PAGE 1 — the feed: a controlled vertical pager ══ */}
          <div
            ref={containerRef}
            className="relative w-screen h-full flex-shrink-0 overflow-hidden bg-black"
            style={{ touchAction: 'none' }}
            onWheel={onFeedWheel}
          >
            {items.length === 0 ? (
              /* ─── EMPTY — celebration moment; header stays so the tabs still work ─── */
              <div className="absolute inset-0 celebration-canvas grain bg-ink-950 overflow-hidden flex flex-col items-center justify-center text-center px-8 safe-area-pt safe-area-pb">
                <div className="relative z-10 flex flex-col items-center">
                  <p className="text-[11px] uppercase tracking-[0.42em] text-white/60 mb-3 animate-rise">
                    {tab === 'following' ? 'Following' : 'Live feed'}
                  </p>
                  {tab === 'following' ? (
                    <h2 className="font-sans font-extrabold tracking-tightest text-[40px] text-white leading-[1.05] mb-4 animate-rise">
                      You&apos;re not following<br />anyone <span className="text-celebration">yet</span>
                    </h2>
                  ) : (
                    <h2 className="font-sans font-extrabold tracking-tightest text-[40px] text-white leading-[1.05] mb-4 animate-rise">
                      No one&apos;s live<br />right now &mdash; <span className="text-celebration">be the first</span>
                    </h2>
                  )}
                  <p className="text-white/60 text-sm leading-relaxed max-w-[280px] mb-9">
                    {tab === 'following'
                      ? 'Follow a few creators and this tab becomes your personal front row.'
                      : "The room's quiet for a minute. Catch up on reels or find your next favorite creator."}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/reels')}
                      className="btn-couture min-h-[44px] text-sm"
                    >
                      Watch Reels
                    </button>
                    <button
                      onClick={() => router.push('/search')}
                      className="relative rounded-full px-7 py-3.5 min-h-[44px] text-sm font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 active:scale-[0.97] border border-accent-cyan/40 hover:border-accent-cyan/70 hover:text-white hover:shadow-glow-cyan bg-white/[0.04]"
                    >
                      Find Creators
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div style={{ y }} className="absolute inset-x-0 top-0 will-change-transform">
                {items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    data-index={index}
                    data-feed-idx={index}
                    className="relative w-full h-[100dvh]"
                    style={vp.h ? { height: vp.h } : undefined}
                  >
                    {/* Video — full bleed; double-tap = like (players are pointer-events-none,
                        so empty-area taps land here) */}
                    <div
                      className="absolute inset-0"
                      onClick={() => {
                        const now = Date.now();
                        if (now - feedLastTapRef.current < 300) {
                          feedLastTapRef.current = 0;
                          likeFeedItem(item);
                        } else {
                          feedLastTapRef.current = now;
                        }
                      }}
                    >
                      {/* Branded neon base — ALWAYS present so a feed item is NEVER a
                          blank/black screen (an unplayable/processing asset must still
                          read as a designed app screen, App Store Guideline 2.1(a)). */}
                      <div className="absolute inset-0 celebration-canvas" />

                      {/* Large, soft creator avatar backdrop — gives the fallback a face
                          and colour instead of a dark void when no video is playing. */}
                      {item.avatarUrl && (
                        <img
                          src={item.avatarUrl}
                          alt=""
                          aria-hidden
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-125"
                        />
                      )}

                      {/* Poster (Mux thumbnail); hides itself if the asset has no thumb yet. */}
                      {item.muxPlaybackId && (
                        <img
                          src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.jpg?time=2&width=720&height=1280&fit_mode=crop`}
                          alt=""
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}

                      {/* Player — only near the active index, and only until it errors.
                          A live stream that isn't actually broadcasting fires onError →
                          we drop to the poster instead of Mux's stuck loading screen. */}
                      {item.muxPlaybackId && Math.abs(index - activeIndex) <= 1 && !videoOffline[item.id] && (
                        <MuxPlayer
                          playbackId={item.muxPlaybackId}
                          streamType={item.isLive ? 'live' : 'on-demand'}
                          autoPlay={index === activeIndex ? 'muted' : false}
                          playsInline
                          loop={!item.isLive}
                          {...(item.isLive ? { targetLiveWindow: 6 } : {})}
                          onPlaying={() => { videoPlayingRef.current[item.id] = true; }}
                          onError={() => setVideoOffline((p) => ({ ...p, [item.id]: true }))}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', '--media-object-fit': 'cover', pointerEvents: 'none' } as any}
                        />
                      )}

                      {/* Direct-URL reel (no Mux asset) — plays a plain <video>. */}
                      {!item.muxPlaybackId && item.videoUrl && Math.abs(index - activeIndex) <= 1 && !videoOffline[item.id] && (
                        <video
                          src={item.videoUrl}
                          autoPlay={index === activeIndex}
                          muted={!!item.musicTrackUrl || !(soundOn && index === activeIndex)}
                          playsInline
                          loop
                          onPlaying={() => { videoPlayingRef.current[item.id] = true; }}
                          onError={() => setVideoOffline((p) => ({ ...p, [item.id]: true }))}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                      )}

                      {/* Library music — replaces the reel's original audio */}
                      {item.musicTrackUrl && Math.abs(index - activeIndex) <= 1 && (
                        <audio data-feed-music src={item.musicTrackUrl} loop preload="none" muted />
                      )}

                      {/* Branded fallback card — shows whenever there's no playable video
                          (no asset, still processing, or errored) for BOTH live streams
                          and reels. Guarantees the screen always reads as the app, never
                          a black page. */}
                      {((!item.muxPlaybackId && !item.videoUrl) || videoOffline[item.id]) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-glow mb-5 bg-white/5">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-white/70">
                                {item.displayName?.charAt(0) || '✦'}
                              </div>
                            )}
                          </div>
                          <p className="font-sans font-extrabold tracking-tight text-2xl text-white mb-2">
                            {item.displayName}
                          </p>
                          <span className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/85">
                            {item.isLive ? (
                              <><span className="w-2 h-2 rounded-full bg-live animate-pulse" /> Live starting soon</>
                            ) : (
                              <>Loading reel&hellip;</>
                            )}
                          </span>
                          <p className="mt-8 text-[11px] uppercase tracking-[0.4em] text-white/30">Be With Me</p>
                        </div>
                      )}
                    </div>

                    {/* Cinematic scrims — deep ink gradients for legibility over footage */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-ink-950/75 via-ink-950/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-[26rem] bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent" />
                      {/* whisper of side vignette so the action rail reads on bright footage */}
                      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950/35 to-transparent" />
                    </div>

                    {/* Right action rail — TikTok thumb-reach ergonomics */}
                    <div className="absolute right-2 bottom-[172px] z-30">
                      <FloatingActions
                        liked={!!liked[item.id]}
                        followed={!!followedCreators[item.creatorId]}
                        likeCount={item.likesCount + (liked[item.id] ? 1 : 0)}
                        commentCount={item.commentsCount}
                        onLike={() => {
                          const token = localStorage.getItem('token');
                          if (!token) { router.push('/auth/login'); return; }
                          const nowLiked = !liked[item.id];
                          setLiked(prev => ({ ...prev, [item.id]: nowLiked }));
                          // Reels persist through the real like API; the analytics
                          // event alone never changed the count for anyone.
                          if (item.type === 'reel') {
                            fetch(`${API_URL}/api/reels/${item.id}/like`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            }).catch(() => setLiked(prev => ({ ...prev, [item.id]: !nowLiked })));
                          }
                          fetch(`${API_URL}/api/feed/event`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ contentId: item.id, contentType: item.type, creatorId: item.creatorId, event: 'like' }),
                          }).catch(() => {});
                        }}
                        onComment={() => {
                          if (item.streamId) router.push(`/stream/${item.streamId}`);
                          else router.push(`/reels/${item.id}`);
                        }}
                        onGift={item.streamId ? () => setShowGifts(true) : undefined}
                        onShare={() => setShowShare(true)}
                        onMore={() => setShowReport(true)}
                        onFollow={() => {
                          const token = localStorage.getItem('token');
                          if (!token) { router.push('/auth/login'); return; }
                          const next = !followedCreators[item.creatorId];
                          setFollowedCreators(prev => ({ ...prev, [item.creatorId]: next }));
                          fetch(`${API_URL}/api/feed/follow`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ creatorId: item.creatorId }),
                          })
                            .then(r => { if (!r.ok) throw new Error(); })
                            .catch(() => setFollowedCreators(prev => ({ ...prev, [item.creatorId]: !next })));
                        }}
                        showFollow
                      />
                    </div>

                    {/* Bottom info — name as a bold headline, handle as a cool-cyan byline */}
                    <div className="absolute bottom-[86px] left-0 right-[68px] z-20 px-4 safe-area-pb">
                      {/* Creator — avatar + bold display name, tap → profile */}
                      <button
                        onClick={() => router.push(`/profile/${item.username}`)}
                        className="flex items-center gap-2.5 mb-1.5 max-w-full text-left"
                      >
                        <span className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/30 bg-ink-800 flex-shrink-0 shadow-glow">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-base font-bold text-white/80">
                              {item.displayName.charAt(0)}
                            </span>
                          )}
                        </span>
                        <span className="font-sans font-bold tracking-tight text-[21px] text-white text-shadow-lg truncate">
                          {item.displayName}
                        </span>
                      </button>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-accent-cyan text-[13px] font-semibold tracking-wide text-shadow">
                          @{item.username}
                        </p>
                        {item.isLive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-live/20 border border-live/50 backdrop-blur-md shadow-glow-live leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                            <span className="text-[11px] font-bold tracking-[0.18em] text-white">LIVE</span>
                          </span>
                        )}
                      </div>

                      {/* Caption */}
                      {(item.title || item.caption) && (
                        <p className="text-white/85 text-[13px] leading-[19px] mb-2 line-clamp-2 text-shadow">
                          {item.title || item.caption}
                        </p>
                      )}

                      {/* Hashtags — cool blue accent */}
                      {item.hashtags.length > 0 && (
                        <p className="text-accent-blue/90 text-[12px] tracking-wide mb-2 text-shadow">
                          {item.hashtags.slice(0, 4).map(tag => `#${tag}`).join('  ')}
                        </p>
                      )}

                      {/* Join Live CTA — glass, pink→violet live energy, unmistakably tappable */}
                      {item.isLive && item.streamId && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => router.push(`/stream/${item.streamId}`)}
                          className="glimmer relative w-full min-h-[44px] py-3 rounded-2xl overflow-hidden bg-gradient-to-r from-brand-500/90 via-brand-600/85 to-violet-deep/85 backdrop-blur-md border border-white/20 shadow-glow text-white text-[13px] font-bold flex items-center justify-center gap-2 mb-3"
                        >
                          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/70 to-transparent pointer-events-none" />
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-[14px] font-extrabold tracking-tight">Join Live</span>
                          <span className="text-white/70 font-medium">&middot; {item.viewerCount} watching</span>
                        </motion.button>
                      )}

                      {/* Sound bar — hairline glass */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] text-white/60">&#9835;</span>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-white/45 text-[12px] whitespace-nowrap tracking-wide">
                            Original Sound &mdash; {item.displayName}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 border border-white/25 bg-ink-800">
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
              </motion.div>
            )}

            {/* ─── Sound control — the feed autoplays muted (browser rule), so this
                pill is the one obvious way in. Big when muted, compact once on. ─── */}
            {items.length > 0 && (
              <button
                onClick={toggleFeedSound}
                aria-label={soundOn ? 'Mute' : 'Turn sound on'}
                className={`absolute left-1/2 -translate-x-1/2 z-40 no-select transition-all duration-300 ${
                  soundOn
                    ? 'bottom-[92px] w-11 h-11 rounded-full bg-ink-950/60 backdrop-blur-xl border border-white/15 flex items-center justify-center'
                    : 'bottom-[96px] px-5 py-3 min-h-[46px] rounded-full bg-ink-950/75 backdrop-blur-xl border border-white/25 shadow-glow flex items-center gap-2 animate-glow-breathe'
                }`}
              >
                {soundOn ? (
                  <Volume2 className="w-4 h-4 text-white/80" />
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-bold">Tap for sound</span>
                  </>
                )}
              </button>
            )}

            {/* ─── Top Header — rides the panel, slides away with it ─── */}
            <div className="absolute top-0 left-0 right-0 z-50 safe-area-pt pointer-events-none">
              {/* Story row scrolls horizontally on its own — exempt from paging */}
              <div className="pointer-events-auto" data-pager-exempt-x>
                <StoryRow />
              </div>
              <div className="flex items-center justify-center py-2 relative">
                <div className="flex items-center pointer-events-auto">
                  <button
                    onClick={() => { setTab('following'); setActiveIndex(0); }}
                    className={`px-4 py-2 min-h-[44px] text-[15px] tracking-wide transition-all duration-300 ${
                      tab === 'following'
                        ? 'text-white font-bold text-shadow'
                        : 'text-white/40 font-medium'
                    }`}
                  >
                    Following
                  </button>
                  <div className="w-px h-3.5 bg-gradient-to-b from-transparent via-white/30 to-transparent mx-1" />
                  <button
                    onClick={() => { setTab('for_you'); setActiveIndex(0); }}
                    className={`px-4 py-2 min-h-[44px] text-[15px] tracking-wide transition-all duration-300 ${
                      tab === 'for_you'
                        ? 'text-white font-bold text-shadow'
                        : 'text-white/40 font-medium'
                    }`}
                  >
                    For You
                  </button>
                </div>
                {/* Active indicator — multicolor neon hairline, same spring behavior */}
                <motion.div
                  className="absolute bottom-0 h-[2px] w-8 rounded-full gradient-celebration shadow-glow pointer-events-none"
                  animate={{ x: tab === 'following' ? -40 : 40 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 25 }
                  }
                />
                {/* DMs — the left page; the icon slides you there like IG */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => goToPage(PAGE_MESSAGES)}
                  className="absolute left-2 pointer-events-auto w-11 h-11 flex items-center justify-center"
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5 text-white drop-shadow-lg" />
                </motion.button>
                {/* Create — the right page; same slide the swipe does */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => goToPage(PAGE_STUDIO)}
                  className="absolute right-12 pointer-events-auto w-11 h-11 flex items-center justify-center"
                  aria-label="Create"
                >
                  <Plus className="w-5 h-5 text-white drop-shadow-lg" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => router.push('/search')}
                  className="absolute right-2 pointer-events-auto w-11 h-11 flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 text-white drop-shadow-lg" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* ══ PAGE 2 — Studio create hub (swipe left from the feed) ══ */}
          <div className="relative w-screen h-full flex-shrink-0 overflow-hidden bg-ink-950">
            {sideMounted && <StudioHub onClose={() => goToPage(PAGE_FEED)} />}
          </div>
        </motion.div>
      </div>

      {/* Bottom tab bar renders once in _app so it persists across tabs. */}

      {/* Sheets */}
      <GlassBottomSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a Gift">
        {activeItem?.streamId && <GiftPanel streamId={activeItem.streamId} onClose={() => setShowGifts(false)} />}
      </GlassBottomSheet>
      <ShareSheet open={showShare} onClose={() => setShowShare(false)} streamId={activeItem?.streamId || undefined} creatorName={activeItem?.username} title={activeItem?.title || undefined} />
      <ReportSheet
        open={showReport}
        onClose={() => setShowReport(false)}
        targetCreatorId={activeItem?.creatorId || undefined}
        targetStreamId={activeItem?.type === 'stream' ? activeItem?.streamId || undefined : undefined}
        targetReelId={activeItem?.type === 'reel' ? activeItem?.id : undefined}
        targetName={activeItem?.username}
        onBlocked={({ creatorId }) => {
          if (!creatorId) return;
          setItems((prev) => prev.filter((it) => it.creatorId !== creatorId));
          setActiveIndex(0);
        }}
      />
    </>
  );
}
