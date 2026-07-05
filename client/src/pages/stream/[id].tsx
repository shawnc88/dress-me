import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { NumberRoller } from '@/components/ui/NumberRoller';
import { GlassBottomSheet } from '@/components/ui/GlassBottomSheet';
import { LiveEffectsEngine } from '@/components/live-effects/LiveEffectsEngine';
import { HeartTapOverlay, tapHeart } from '@/components/ui/HeartTapOverlay';
import { ShareSheet } from '@/components/ui/ShareSheet';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { GiftLeaderboard } from '@/components/ui/GiftLeaderboard';
import { FollowPrompt } from '@/components/ui/FollowPrompt';
import { useFeedEvents } from '@/hooks/useFeedEvents';
import { useViewerPresence } from '@/hooks/useViewerPresence';
import { useEngagement } from '@/hooks/useEngagement';
import { X, ChevronLeft, Sparkles, Volume2, VolumeX, Gift, Heart } from 'lucide-react';
import { SpendingTriggers } from '@/components/stream/SpendingTriggers';
import { LiveGiftCallout } from '@/components/stream/LiveGiftCallout';
import { SuiteInviteModal } from '@/components/suite/SuiteInviteModal';
import { BuyCoinsModal } from '@/components/payment/BuyCoinsModal';
import { SupporterLeaderboard } from '@/components/monetization/SupporterLeaderboard';
import { ScarcityBadge } from '@/components/monetization/ScarcityBadge';
import { VipBadge } from '@/components/ui/VipBadge';
import { fetchWithTimeout } from '@/utils/api';

const VideoSurface = dynamic(
  () => import('@/components/video/VideoSurface').then((m) => m.VideoSurface),
  { ssr: false }
);

/*
 * 3D is EVENT-DRIVEN only (gifts + entrances via LiveEffectsEngine + GiftScene).
 * GUARDRAIL: never a WebGL canvas behind/over the live video — and no ambient
 * 3D backdrops on the LOADING / SCHEDULED / ENDED states either. Those states
 * use the cheap colorful CSS `.celebration-canvas` instead.
 */
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
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [threadBalance, setThreadBalance] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const { trackEvent, trackViewDuration } = useFeedEvents();
  const { viewerCount: liveViewerCount } = useViewerPresence(id as string | undefined);
  const { trackEvent: trackEngagement } = useEngagement(id as string | undefined);
  const [suiteInvite, setSuiteInvite] = useState<{ expiresAt: string } | null>(null);
  const [showSuiteInvite, setShowSuiteInvite] = useState(false);
  const seenInviteIds = useRef<Set<string>>(new Set());
  const [mySubBadge, setMySubBadge] = useState<string | null>(null);
  const heartOverlayRef = useRef<{ tap: () => void; tapBurst: (n?: number) => void } | null>(null);
  const reduceMotion = useReducedMotion();

  // Check subscription badge for current user
  useEffect(() => {
    if (!stream) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const creatorId = (stream as any).creatorId;
    if (!creatorId) return;
    fetch(`${API_URL}/api/fan-subscriptions/check/${creatorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.subscription?.tier?.name) setMySubBadge(data.subscription.tier.name.toLowerCase());
      })
      .catch(() => {});
  }, [stream]);

  // Check for Suite invite — track seen IDs to prevent re-showing
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const checkInvite = () => {
      fetch(`${API_URL}/api/streams/${id}/suite/my-invite`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.invited && data.invite?.status === 'PENDING') {
            const inviteId = data.invite.id;
            if (!seenInviteIds.current.has(inviteId)) {
              seenInviteIds.current.add(inviteId);
              setSuiteInvite({ expiresAt: data.invite.expiresAt });
              setShowSuiteInvite(true);
            }
          }
        })
        .catch(() => {});
    };

    checkInvite();
    const interval = setInterval(checkInvite, 10000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    function fetchStream() {
      fetchWithTimeout(`${API_URL}/api/streams/${id}`)
        .then((r) => {
          if (!r.ok) throw new Error('Stream not found');
          return r.json();
        })
        .then((data) => {
          setStream(data.stream);
          setPlaybackId(data.stream?.muxPlaybackId || null);
          if (data.stream?.creator) {
            trackEvent(data.stream.creatorId || data.stream.creator.id || '', 'stream_join', undefined, data.stream.id);
          }
        })
        .catch((err) => setError(err.message));
    }

    fetchStream();

    // Poll every 5s to detect SCHEDULED → LIVE transition
    const interval = setInterval(fetchStream, 5000);
    return () => clearInterval(interval);
  }, [id, trackEvent]);

  // Hard cap: if the stream hasn't loaded after 12s (cold/hung backend),
  // fall through to the existing error UI instead of hanging on the loader.
  useEffect(() => {
    if (!id || stream) return;
    const t = setTimeout(() => setError('Stream not found'), 12000);
    return () => clearTimeout(t);
  }, [id, stream]);

  // Track view duration
  useEffect(() => {
    if (!stream) return;
    const creatorId = (stream as any).creatorId || '';
    if (!creatorId) return;
    return trackViewDuration(creatorId, stream.id);
  }, [stream, trackViewDuration]);

  // Fetch thread balance for spending triggers
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    fetch(`${API_URL}/api/threads/balance`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.balance != null) setThreadBalance(data.balance); })
      .catch(() => {});
  }, []);

  // Check follow status when stream loads
  useEffect(() => {
    if (!stream) return;
    const t = localStorage.getItem('token');
    if (!t) return;
    const creatorId = (stream as any).creatorId;
    if (!creatorId) return;
    fetch(`${API_URL}/api/feed/following`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.following?.includes(creatorId)) setFollowing(true);
      })
      .catch(() => {});
  }, [stream]);

  function handleFollow() {
    const t = localStorage.getItem('token');
    if (!t || !stream) return;
    const creatorId = (stream as any).creatorId;
    if (!creatorId) return;
    // Optimistic UI
    setFollowing((prev) => !prev);
    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ creatorId }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setFollowing(data.followed);
      })
      .catch(() => setFollowing((prev) => !prev)); // revert on error
  }

  function handleLike() {
    if (!stream) return;
    // Flip the boolean state for the like button styling
    setLiked(!liked);
    // Always spawn a local heart so rapid tapping feels instant
    heartOverlayRef.current?.tap();
    // Broadcast to other viewers (rate-limited server-side)
    tapHeart(stream.id);
    if (!liked) {
      trackEvent((stream as any).creatorId || '', 'like', undefined, stream.id);
      trackEngagement('like');
    }
  }

  /* ─── ERROR state — stream not found (CSS celebration bg, no 3D) ─── */
  if (error) {
    return (
      <div className="fixed inset-0 celebration-canvas grain overflow-hidden flex items-center justify-center px-8">
        <div className="relative z-10 text-center max-w-sm animate-rise">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-4 no-select">
            Stream not found
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
            This stream isn&apos;t <span className="text-celebration">available</span>
          </h1>
          <p className="text-white/45 text-sm mb-8">{error}</p>
          <button
            onClick={() => router.push('/streams')}
            className="btn-couture min-h-[48px] w-full shadow-glow"
          >
            Find who&apos;s live now
          </button>
        </div>
      </div>
    );
  }

  /* ─── LOADING state — pre-join (CSS celebration bg, no 3D) ─── */
  if (!stream) {
    return (
      <div className="fixed inset-0 celebration-canvas grain overflow-hidden">
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center safe-area-pt safe-area-pb no-select">
          <h1 className="text-5xl font-extrabold tracking-tight text-white animate-blur-in">
            Be <span className="text-celebration">With</span> Me
          </h1>
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 mt-5 animate-rise">
            Joining the stream
          </p>
          <div className="mt-8 h-px w-40 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,79,163,0.9),rgba(34,224,214,0.9),transparent)] bg-[length:200%_100%]" />
          </div>
        </div>
      </div>
    );
  }

  const isLive = stream.status === 'LIVE';
  const isScheduled = stream.status === 'SCHEDULED';
  // Mirrors VideoSurface: ended/offline with no replay → plain fallback → ended cover
  const showEndedCover = !isLive && !isScheduled && !playbackId;
  const uptime = stream.startedAt
    ? Math.round((Date.now() - new Date(stream.startedAt).getTime()) / 60000)
    : 0;
  const showSuiteCta = isLive && (stream.streamType === 'PREMIUM' || stream.streamType === 'ELITE');
  const showFollowCta = isLive && !showSuiteCta && !following;
  const hasMainCta = showSuiteCta || showFollowCta;

  return (
    <>
      <Head>
        <title>{stream.title} - Be With Me</title>
      </Head>

      {/* ─── Full-Screen Vertical Layout ─── */}
      <div className="fixed inset-0 bg-ink-950">
        {/* Video fills entire screen */}
        <div className="absolute inset-0 z-0">
          <VideoSurface
            playbackId={playbackId}
            streamId={stream.id}
            streamStatus={stream.status}
            creatorName={stream.creator.user.displayName}
            title={stream.title}
            isLive={isLive}
          />
        </div>

        {/* Cinematic scrims — legibility chrome over video (CSS only) */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-ink-950/85 via-ink-950/35 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-[22rem] bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-transparent" />
          {/* Faint neon color wash — pink energy low-left, cool blue depth high-right */}
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -top-10 -right-14 w-60 h-60 rounded-full bg-accent-blue/10 blur-3xl" />
        </div>

        {/* ─── Cover: SCHEDULED — starting soon (CSS celebration bg, no 3D, no video underneath) ─── */}
        {isScheduled && (
          <div className="absolute inset-0 z-[5] celebration-canvas grain overflow-hidden pointer-events-none" aria-hidden>
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pb-60 text-center no-select">
              <div className="ring-creator mb-7">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-ink-800">
                  {stream.creator.user.avatarUrl ? (
                    <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {stream.creator.user.displayName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent-cyan/90 mb-4 animate-rise">
                Starting soon
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white animate-blur-in">
                {stream.creator.user.displayName}{' '}
                <span className="text-celebration">is about to go live</span>
              </h2>
              <p className="text-white/45 text-sm mt-4">Hang tight — the stream kicks off any moment</p>
              <div className="mt-8 h-px w-40 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,79,163,0.9),rgba(34,224,214,0.9),transparent)] bg-[length:200%_100%]" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Cover: ENDED / offline (no replay) — CSS celebration bg + CTAs, no 3D ─── */}
        {showEndedCover && (
          <div className="absolute inset-0 z-[5] celebration-canvas grain overflow-hidden pointer-events-none">
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pb-64 text-center">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mt-2 no-select">
                Offline
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white mt-3 animate-blur-in">
                This stream <span className="text-celebration">has ended</span>
              </h2>
              <p className="text-white/45 text-sm mt-4">
                {stream.creator.user.displayName}
                {uptime > 0 ? ` was live for ${uptime} min — ` : ` has wrapped up — `}
                catch them next time.
              </p>
              <div className="pointer-events-auto mt-8 w-full max-w-xs space-y-3">
                <button
                  onClick={() => router.push('/streams')}
                  className="btn-couture w-full min-h-[48px] shadow-glow"
                >
                  Find who&apos;s live now
                </button>
                <button
                  onClick={() => {
                    if (stream.creator.user.username) {
                      window.location.href = `/profile/${stream.creator.user.username}`;
                    }
                  }}
                  className="btn-couture-ghost w-full min-h-[48px]"
                >
                  Visit {stream.creator.user.displayName}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Top Bar — dark glass ─── */}
        <div className="absolute top-0 left-0 right-0 z-30 safe-area-pt">
          <div className="flex items-center justify-between gap-2 px-3 py-3 no-select">
            {/* Back + Creator info */}
            <div className="flex items-center gap-2 min-w-0">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => router.back()}
                aria-label="Back"
                className="w-11 h-11 shrink-0 rounded-full bg-ink-950/55 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-glass-sm"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </motion.button>

              <div className="flex items-center gap-2.5 min-w-0 rounded-full bg-ink-950/55 backdrop-blur-xl border border-white/10 pl-1.5 pr-4 py-1.5 shadow-glass-sm">
                <div className={`shrink-0 ${isLive ? 'ring-creator' : ''}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-500/25">
                    {stream.creator.user.avatarUrl ? (
                      <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-300">
                        {stream.creator.user.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{stream.creator.user.displayName}</p>
                  <p className="text-white/55 text-[11px] truncate">@{stream.creator.user.username}</p>
                </div>
              </div>
            </div>

            {/* Live badge + sound toggle + close */}
            <div className="flex items-center gap-2 shrink-0">
              {isLive && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="flex h-11 items-center gap-2 rounded-full bg-ink-950/60 backdrop-blur-xl border border-live/30 pl-3 pr-3.5 shadow-glow-live"
                >
                  <motion.span
                    animate={reduceMotion ? undefined : { scale: [1, 1.35, 1], opacity: [1, 0.65, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-2 h-2 rounded-full bg-live"
                  />
                  <span className="text-live text-[11px] font-bold tracking-[0.22em]">LIVE</span>
                  <span className="w-px h-3.5 bg-white/15" />
                  <span className="text-accent-cyan/90 text-[11px] font-medium tabular-nums">
                    <NumberRoller value={liveViewerCount || stream.viewerCount} />
                  </span>
                </motion.div>
              )}

              {/* Sound toggle — always in top bar, always clickable */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                aria-label={audioEnabled ? 'Mute' : 'Unmute'}
                onClick={() => {
                  const video = document.querySelector('mux-player')?.shadowRoot?.querySelector('video')
                    || document.querySelector('video');
                  if (video) {
                    if (audioEnabled) {
                      video.muted = true;
                      setAudioEnabled(false);
                    } else {
                      video.muted = false;
                      video.volume = 1;
                      video.play().catch(() => {});
                      setAudioEnabled(true);
                    }
                  }
                }}
                className={`w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center transition-colors ${
                  audioEnabled
                    ? 'bg-white/15 border-white/15'
                    : 'bg-live/70 border-live/40 shadow-glow-live'
                }`}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4 text-white" />
                ) : (
                  <VolumeX className="w-4 h-4 text-white" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => router.push('/')}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-ink-950/55 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-glass-sm"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
          {/* Neon hairline under the bar — multicolor signature */}
          <div
            className="mx-4 h-px pointer-events-none bg-[linear-gradient(90deg,transparent,rgba(255,79,163,0.35),rgba(124,92,255,0.3),rgba(34,224,214,0.35),transparent)]"
            aria-hidden
          />
        </div>

        {/* ─── Right Side Actions (BIGO/TikTok style) ─── */}
        <div className="absolute right-3 bottom-72 z-30">
          <FloatingActions
            liked={liked}
            followed={following}
            likeCount={stream.peakViewers}
            onLike={handleLike}
            onComment={() => setShowChat(!showChat)}
            onGift={() => setShowGifts(!showGifts)}
            onShare={() => setShowShare(true)}
            onMore={() => setShowReport(true)}
            onFollow={handleFollow}
            showFollow
          />
        </div>

        {/* ─── Bottom: Creator info + stream title ─── */}
        <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-8 safe-area-pb">
          {/* Creator identity */}
          <div className="flex items-center gap-3 mb-2.5 no-select">
            <div className={`shrink-0 ${isLive ? 'ring-creator' : 'neon-hairline rounded-full p-[2px]'}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-ink-800">
                {stream.creator.user.avatarUrl ? (
                  <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-300">
                    {stream.creator.user.displayName.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white text-sm font-bold text-shadow truncate">@{stream.creator.user.username}</p>
                {mySubBadge && <VipBadge tier={mySubBadge} size="sm" />}
              </div>
              <p className="text-white/70 text-[11px] text-shadow truncate">
                {stream.creator.user.displayName}
              </p>
            </div>
          </div>

          {/* Stream title — bold universal voice */}
          <h2 className="text-white text-2xl font-bold tracking-tight text-shadow-lg mb-1.5 line-clamp-2">
            {stream.title}
          </h2>
          {stream.description && (
            <p className="text-white/50 text-sm line-clamp-2 mb-3">{stream.description}</p>
          )}

          {/* CTA row — vibrant suite/follow CTA + colorful gift trigger */}
          {isLive && (
            <div className="flex items-stretch gap-2.5 mb-3">
              {showSuiteCta && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (stream.creator.user.username) {
                      window.location.href = `/profile/${stream.creator.user.username}`;
                    }
                  }}
                  className="btn-couture flex-1 min-h-[48px] flex items-center justify-center gap-2 text-sm shadow-glow-violet"
                >
                  <Sparkles className="w-4 h-4 text-accent-yellow" />
                  Join Be With Me Suite
                </motion.button>
              )}
              {showFollowCta && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFollow}
                  className="btn-couture-ghost flex-1 min-h-[48px] flex items-center justify-center gap-2 text-sm hover:shadow-glow"
                >
                  <Heart className="w-4 h-4 text-brand-400" />
                  Follow @{stream.creator.user.username}
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowGifts(true)}
                aria-label="Send a gift"
                className={`relative overflow-hidden rounded-full neon-hairline backdrop-blur-xl flex items-center justify-center gap-2 shadow-glow-amber animate-glow-breathe ${
                  hasMainCta ? 'w-12 min-h-[48px] shrink-0' : 'flex-1 min-h-[48px] px-6'
                }`}
              >
                <span
                  className="absolute inset-0 bg-gradient-to-br from-brand-500/25 via-transparent to-accent-cyan/20 pointer-events-none"
                  aria-hidden
                />
                <Gift className="w-5 h-5 text-accent-amber relative" />
                {!hasMainCta && (
                  <span className="relative text-sm font-semibold text-white">Send a gift</span>
                )}
              </motion.button>
            </div>
          )}

          {/* Chat overlay — cinematic fade at the top edge */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
              >
                <ChatOverlay streamId={stream.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Active Poll Overlay ─── */}
        {stream.polls && stream.polls.length > 0 && (
          <div className="absolute top-[5.5rem] left-4 right-4 z-30">
            <PollOverlay poll={stream.polls[0]} streamId={stream.id} />
          </div>
        )}

        {/* ─── Spending Triggers (emotional peak prompts) ─── */}
        {isLive && (
          <SpendingTriggers
            streamId={stream.id}
            onGift={() => setShowGifts(true)}
            onBuyCoins={() => setShowBuyCoins(true)}
            onSubscribe={() => {
              // Navigate to creator profile for subscription
              if (stream.creator.user.username) {
                window.location.href = `/profile/${stream.creator.user.username}`;
              }
            }}
            creatorName={stream.creator.user.displayName}
            threadBalance={threadBalance}
          />
        )}

        {/* ─── Live Gift Callout (big gifts) ─── */}
        {isLive && <LiveGiftCallout />}

        {/* ─── Live Effects Engine (gifts + tier-aware entrances) ─── */}
        {isLive && <LiveEffectsEngine streamId={stream.id} />}

        {/* ─── Tap-to-like heart shower (TikTok/Instagram-style) ─── */}
        {isLive && <HeartTapOverlay streamId={stream.id} controlRef={heartOverlayRef} />}

        {/* ─── Gift Panel (Bottom Sheet) ─── */}
        <GlassBottomSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a Gift">
          <GiftPanel streamId={stream.id} onClose={() => setShowGifts(false)} />
          <div className="mt-4 pt-4 border-t border-white/5">
            <GiftLeaderboard streamId={stream.id} />
          </div>
          {(stream as any).creatorId && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
              <SupporterLeaderboard creatorId={(stream as any).creatorId} compact />
              <ScarcityBadge creatorId={(stream as any).creatorId} />
            </div>
          )}
        </GlassBottomSheet>

        {/* ─── Share Sheet ─── */}
        <ShareSheet
          open={showShare}
          onClose={() => setShowShare(false)}
          streamId={stream.id}
          creatorName={stream.creator.user.username}
          title={stream.title}
        />

        {/* ─── Follow Prompt ─── */}
        {isLive && !following && (
          <FollowPrompt
            streamId={stream.id}
            creatorName={stream.creator.user.displayName}
            onFollow={handleFollow}
          />
        )}

        {/* ─── Report Sheet ─── */}
        <ReportSheet
          open={showReport}
          onClose={() => setShowReport(false)}
          targetStreamId={stream.id}
          targetName={stream.creator.user.username}
        />

        {/* ─── Buy Coins Modal ─── */}
        <BuyCoinsModal
          open={showBuyCoins}
          onClose={() => setShowBuyCoins(false)}
          currentBalance={threadBalance || 0}
          onPurchased={(newBal) => setThreadBalance(newBal)}
        />

        {/* ─── Suite Invite Modal ─── */}
        {suiteInvite && (
          <SuiteInviteModal
            streamId={stream.id}
            isOpen={showSuiteInvite}
            expiresAt={suiteInvite.expiresAt}
            onAccept={async () => {
              // SuiteInviteModal already called /respond — just get token and navigate
              setShowSuiteInvite(false);
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/streams/${stream.id}/suite/join-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) {
                  alert(data.error?.message || 'Failed to join Suite');
                  return;
                }
                if (data.token && data.wsUrl) {
                  const params = new URLSearchParams({
                    token: data.token,
                    wsUrl: data.wsUrl,
                    room: data.room,
                    role: data.role,
                  });
                  router.push(`/suite/${stream.id}?${params.toString()}`);
                } else {
                  alert('Suite connection info missing. Please try again.');
                }
              } catch (err: any) {
                alert(err.message || 'Failed to join Suite');
              }
            }}
            onDecline={() => {
              // SuiteInviteModal already called /respond with accept:false
              setShowSuiteInvite(false);
              setSuiteInvite(null);
            }}
          />
        )}
      </div>
    </>
  );
}

// Old GiftPrompt removed — replaced by SpendingTriggers component
