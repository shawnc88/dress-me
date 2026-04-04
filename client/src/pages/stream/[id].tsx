import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { GiftPanel } from '@/components/video/GiftPanel';
import { PollOverlay } from '@/components/video/PollOverlay';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { AnimatedLiveBadge } from '@/components/ui/AnimatedLiveBadge';
import { GlassBottomSheet } from '@/components/ui/GlassBottomSheet';
import { GiftAnimationOverlay } from '@/components/ui/GiftAnimationOverlay';
import { ShareSheet } from '@/components/ui/ShareSheet';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { GiftLeaderboard } from '@/components/ui/GiftLeaderboard';
import { FollowPrompt } from '@/components/ui/FollowPrompt';
import { useFeedEvents } from '@/hooks/useFeedEvents';
import { useViewerPresence } from '@/hooks/useViewerPresence';
import { useEngagement } from '@/hooks/useEngagement';
import { X, ChevronLeft, Sparkles, Volume2, VolumeX, Gift, Video } from 'lucide-react';
import { SuiteInviteModal } from '@/components/suite/SuiteInviteModal';

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
  const [error, setError] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showShare, setShowShare] = useState(false);
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
      fetch(`${API_URL}/api/streams/${id}`)
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

  // Track view duration
  useEffect(() => {
    if (!stream) return;
    const creatorId = (stream as any).creatorId || '';
    if (!creatorId) return;
    return trackViewDuration(creatorId, stream.id);
  }, [stream, trackViewDuration]);

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
    setLiked(!liked);
    if (stream && !liked) {
      trackEvent((stream as any).creatorId || '', 'like', undefined, stream.id);
      trackEngagement('like');
    }
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

            {/* Live badge + sound toggle + close */}
            <div className="flex items-center gap-2">
              {isLive && (
                <AnimatedLiveBadge viewerCount={liveViewerCount || stream.viewerCount} />
              )}

              {/* Sound toggle — always in top bar, always clickable */}
              <motion.button
                whileTap={{ scale: 0.9 }}
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
                className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center ${
                  audioEnabled ? 'bg-white/20' : 'bg-red-500/60'
                }`}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4 text-white" />
                ) : (
                  <VolumeX className="w-4 h-4 text-white" />
                )}
              </motion.button>

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
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`rounded-full overflow-hidden flex-shrink-0 ${isLive ? 'ring-creator p-[2px]' : ''}`}>
              <div className={`${isLive ? 'w-9 h-9' : 'w-10 h-10'} rounded-full overflow-hidden bg-brand-500/20`}>
                {stream.creator.user.avatarUrl ? (
                  <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-400">
                    {stream.creator.user.displayName.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold text-shadow">@{stream.creator.user.username}</p>
            </div>
          </div>

          {/* Stream title */}
          <h2 className="text-white font-semibold text-base text-shadow mb-1">
            {stream.title}
          </h2>
          {stream.description && (
            <p className="text-white/50 text-sm line-clamp-2 mb-3">{stream.description}</p>
          )}

          {/* Premium CTA */}
          {isLive && (stream.streamType === 'PREMIUM' || stream.streamType === 'ELITE') && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-2xl gradient-premium text-white text-sm font-bold flex items-center justify-center gap-2 shadow-glow mb-3"
            >
              <Sparkles className="w-4 h-4" />
              Join Dress Me Suite
            </motion.button>
          )}

          {/* Chat overlay */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-40 overflow-hidden"
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

        {/* ─── Gift Prompt (after 30s) ─── */}
        {isLive && <GiftPrompt onGift={() => setShowGifts(true)} />}

        {/* ─── Gift Animations ─── */}
        {isLive && <GiftAnimationOverlay streamId={stream.id} />}

        {/* ─── Gift Panel (Bottom Sheet) ─── */}
        <GlassBottomSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a Gift">
          <GiftPanel streamId={stream.id} onClose={() => setShowGifts(false)} />
          <div className="mt-4 pt-4 border-t border-white/5">
            <GiftLeaderboard streamId={stream.id} />
          </div>
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

        {/* ─── Suite Invite Modal ─── */}
        {suiteInvite && (
          <SuiteInviteModal
            streamId={stream.id}
            isOpen={showSuiteInvite}
            expiresAt={suiteInvite.expiresAt}
            onAccept={async () => {
              setShowSuiteInvite(false);
              // Get suite join token and redirect to Suite room
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/streams/${stream.id}/suite/join-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.token && data.wsUrl) {
                  // Navigate to suite page with token
                  const params = new URLSearchParams({
                    token: data.token,
                    wsUrl: data.wsUrl,
                    room: data.room,
                    role: data.role,
                  });
                  router.push(`/suite/${stream.id}?${params.toString()}`);
                }
              } catch {}
            }}
            onDecline={() => {
              setShowSuiteInvite(false);
              setSuiteInvite(null);
            }}
          />
        )}
      </div>
    </>
  );
}

// ─── Gift Spending Prompt (shows after 30s) ─────────────────────

function GiftPrompt({ onGift }: { onGift: () => void }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (!show || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-44 left-4 right-16 z-40"
    >
      <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-3 border border-amber-500/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold">Enjoying this stream?</p>
          <p className="text-white/30 text-[10px]">Send a gift to show support</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { onGift(); setDismissed(true); }}
          className="px-3 py-1.5 rounded-lg bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex-shrink-0"
        >
          Gift
        </motion.button>
        <button onClick={() => setDismissed(true)} className="text-white/20 text-xs">&times;</button>
      </div>
    </motion.div>
  );
}
