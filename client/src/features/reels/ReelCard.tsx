import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ReelActions } from './ReelActions';
import { Volume2, VolumeX, Heart, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { ReelSpendingPrompt } from '@/components/monetization/ReelSpendingPrompt';
import { ReportSheet } from '@/components/ui/ReportSheet';

// Lazy-load the Mux player (~hundreds of KB) so the reel chunk paints its
// branded backdrop/poster first instead of blocking on the player bundle.
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Persist sound preference across reels + page reloads
let globalSoundOn = typeof window !== 'undefined' && localStorage.getItem('bewithme_sound') === 'on';

interface ReelData {
  id: string;
  creatorId: string;
  videoUrl: string;
  muxPlaybackId?: string;
  caption?: string;
  musicTrackUrl?: string;
  musicTrackTitle?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  creator: { id: string; username: string; displayName: string; avatarUrl?: string } | null;
}

interface ReelCardProps {
  reel: ReelData;
  isActive: boolean;
  onComment: () => void;
  /** Called after the viewer blocks this reel's creator, so the feed can drop their reels instantly. */
  onBlocked?: (creatorId: string) => void;
}

export function ReelCard({ reel, isActive, onComment, onBlocked }: ReelCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showReport, setShowReport] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [soundOn, setSoundOn] = useState(globalSoundOn);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const [paused, setPaused] = useState(false);
  // When a reel's video can't play (still processing / errored), drop MuxPlayer
  // (its own bg is black) and show a branded card so it's never a black screen.
  const [videoFailed, setVideoFailed] = useState(false);
  const [watchTimeMs, setWatchTimeMs] = useState(0);
  const watchStartMsRef = useRef(Date.now());
  const lastTapRef = useRef(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track watch time for spending prompts
  useEffect(() => {
    if (!isActive) { setWatchTimeMs(0); return; }
    watchStartMsRef.current = Date.now();
    const interval = setInterval(() => {
      setWatchTimeMs(Date.now() - watchStartMsRef.current);
    }, 5000); // Update every 5s for prompt checks
    return () => clearInterval(interval);
  }, [isActive]);

  // Follow prompt after 20s watch time
  useEffect(() => {
    if (!isActive || liked) return; // don't show if already engaged
    watchTimerRef.current = setTimeout(() => setShowFollowPrompt(true), 20000);
    return () => { if (watchTimerRef.current) clearTimeout(watchTimerRef.current); };
  }, [isActive, liked]);

  // Auto-apply sound preference when becoming active
  useEffect(() => {
    if (!isActive) return;
    setSoundOn(globalSoundOn);
    if (globalSoundOn) {
      // Small delay to let video mount
      const timer = setTimeout(() => applySound(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Pause off-screen videos
  useEffect(() => {
    if (!isActive) {
      const card = cardRef.current;
      musicRef.current?.pause();
      if (!card) return;
      const video = findVideo(card);
      if (video) video.pause();
    } else if (reel.musicTrackUrl && globalSoundOn) {
      const t = setTimeout(() => musicRef.current?.play().catch(() => {}), 200);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  function findVideo(card: HTMLElement): HTMLVideoElement | null {
    const muxEl = card.querySelector('mux-player') as any;
    return muxEl?.shadowRoot?.querySelector('video') || card.querySelector('video');
  }

  function applySound(on: boolean) {
    const card = cardRef.current;
    if (!card) return;
    const video = findVideo(card);
    // Library music REPLACES original audio (TikTok semantics): the video
    // element stays muted forever; sound state drives the audio element.
    if (reel.musicTrackUrl && musicRef.current) {
      if (video) video.muted = true;
      const a = musicRef.current;
      a.muted = !on;
      if (on) { a.volume = 1; a.play().catch(() => {}); }
      return;
    }
    if (!video) return;
    if (on) {
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => {});
    } else {
      video.muted = true;
    }
  }

  function toggleSound() {
    const next = !soundOn;
    globalSoundOn = next;
    setSoundOn(next);
    applySound(next);
    try { localStorage.setItem('bewithme_sound', next ? 'on' : 'off'); } catch {}
  }

  function handleLike() {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => newLiked ? c + 1 : c - 1);
    fetch(`${API_URL}/api/reels/${reel.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {
      setLiked(l => !l);
      setLikesCount(c => newLiked ? c - 1 : c + 1);
    });
    fetch(`${API_URL}/api/feed/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contentId: reel.id, contentType: 'reel', creatorId: reel.creatorId, event: 'like' }),
    }).catch(() => {});
  }

  function handleShare() {
    fetch(`${API_URL}/api/reels/${reel.id}/share`, { method: 'POST' }).catch(() => {});
    const url = `https://bewithme.live/reels/${reel.id}`;
    if (typeof navigator.share === 'function') {
      navigator.share({ title: reel.caption || 'Check this out', url }).catch(() => {});
    } else {
      // Desktop / older webviews: copy is the fallback, never a dead button.
      navigator.clipboard?.writeText(url).catch(() => {});
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  function handleFollow() {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    if (!reel.creator) return;
    setFollowed(prev => !prev);
    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId: reel.creatorId }),
    })
      .then(r => { if (!r.ok) throw new Error(); })
      .catch(() => setFollowed(prev => !prev));
  }

  // Double-tap to like
  const handleDoubleTap = useCallback(() => {
    if (!liked) handleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  }, [liked, reel.id]);

  // Tap handler: single tap = nothing (let scroll work), double tap = like
  function handleTouchEnd(e: React.TouchEvent) {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  // Long press = pause/resume
  function handleTouchStart() {
    longPressRef.current = setTimeout(() => {
      const card = cardRef.current;
      if (!card) return;
      const video = findVideo(card);
      if (video) {
        if (video.paused) {
          video.play().catch(() => {});
          if (reel.musicTrackUrl && globalSoundOn) musicRef.current?.play().catch(() => {});
          setPaused(false);
        } else {
          video.pause();
          musicRef.current?.pause();
          setPaused(true);
        }
      }
    }, 500);
  }

  function handleTouchEndRelease() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  return (
    <div ref={cardRef} className="relative w-full h-full bg-black">
      {/* Branded neon backdrop — always behind the video so an unplayable or
          still-processing reel is never a black void (App Store 2.1(a)). */}
      <div className="absolute inset-0 celebration-canvas" />
      {reel.creator?.avatarUrl && (
        <img
          src={reel.creator.avatarUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-125"
        />
      )}

      {/* Touch zone for double-tap / long-press — covers video area only, not action buttons */}
      <div
        className="absolute inset-0 z-10"
        style={{ right: '60px' }}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchCancel={handleTouchEndRelease}
      />
      {/* Video */}
      {reel.muxPlaybackId ? (
        !videoFailed && (
          <MuxPlayer
            playbackId={reel.muxPlaybackId}
            streamType="on-demand"
            autoPlay={isActive ? 'muted' : false}
            playsInline
            loop
            onError={() => setVideoFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
            primaryColor="#ec4899"
          />
        )
      ) : (
        <video
          src={reel.videoUrl}
          autoPlay={isActive}
          playsInline
          loop
          muted={!!reel.musicTrackUrl || !soundOn}
          onError={() => setVideoFailed(true)}
          className="w-full h-full object-cover"
        />
      )}

      {/* Library music — replaces original audio; driven by the sound pref */}
      {reel.musicTrackUrl && (
        <audio ref={musicRef} src={reel.musicTrackUrl} loop preload="none" muted={!soundOn} />
      )}

      {/* Branded fallback when there's no playable video */}
      {videoFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-glow mb-5 bg-white/5">
            {reel.creator?.avatarUrl ? (
              <img src={reel.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-white/70">
                {reel.creator?.displayName?.charAt(0) || '✦'}
              </div>
            )}
          </div>
          <p className="font-sans font-extrabold tracking-tight text-2xl text-white mb-2">
            {reel.creator?.displayName || 'Be With Me'}
          </p>
          <span className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/85">
            Loading reel&hellip;
          </span>
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-8 bg-white rounded-sm" />
              <div className="w-3 h-8 bg-white rounded-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Sound toggle — above touch zone */}
      <button
        onClick={toggleSound}
        className="absolute top-16 right-3 z-30 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center glimmer overflow-hidden"
      >
        {soundOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
      </button>

      {/* "Tap for sound" — the small corner toggle was invisible to real users;
          when the active reel is muted, say it loud. */}
      {isActive && !soundOn && (
        <button
          onClick={toggleSound}
          className="absolute bottom-[132px] left-1/2 -translate-x-1/2 z-30 px-5 py-3 min-h-[46px] rounded-full bg-black/70 backdrop-blur-xl border border-white/25 shadow-glow flex items-center gap-2 animate-glow-breathe no-select"
        >
          <VolumeX className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-bold">Tap for sound</span>
        </button>
      )}

      {/* Report / block — required UGC safety control (App Store Guideline 1.2) */}
      <button
        onClick={() => setShowReport(true)}
        aria-label="Report or block"
        className="absolute top-[104px] right-3 z-30 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center glimmer overflow-hidden"
      >
        <MoreHorizontal className="w-4 h-4 text-white" />
      </button>

      {/* Right actions — z-30 above touch zone (z-10) */}
      <div className="absolute right-3 bottom-36 z-30">
        {reel.creator && (
          <div className="flex flex-col items-center mb-5">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border-2 border-white">
              {reel.creator.avatarUrl ? (
                <img src={reel.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/60">
                  {reel.creator.displayName.charAt(0)}
                </div>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleFollow}
              aria-label={followed ? 'Following' : 'Follow'}
              className={`relative w-5 h-5 rounded-full flex items-center justify-center -mt-2.5 border border-white text-white text-[11px] font-bold before:content-[''] before:absolute before:-inset-3 transition-colors ${
                followed ? 'bg-accent-green' : 'bg-brand-500'
              }`}
            >
              {followed ? '✓' : '+'}
            </motion.button>
          </div>
        )}

        <ReelActions
          liked={liked}
          likesCount={likesCount}
          commentsCount={reel.commentsCount}
          sharesCount={reel.sharesCount}
          onLike={handleLike}
          onComment={onComment}
          onShare={handleShare}
          onFollow={handleFollow}
        />
      </div>

      {/* Bottom info — z-20 above touch zone, below action buttons; lifted to clear the tab bar */}
      <div className="absolute bottom-24 left-4 right-16 z-20 safe-area-pb">
        {/* Creator name — tappable to profile */}
        {reel.creator && (
          <button
            onClick={() => router.push(`/profile/${reel.creator!.username}`)}
            className="text-white text-sm font-bold mb-1 text-left"
          >
            @{reel.creator.username}
          </button>
        )}

        {/* Expandable caption */}
        {reel.caption && (
          <div className="mb-1.5">
            <p className={`text-white/90 text-sm ${captionExpanded ? '' : 'line-clamp-2'}`}>
              {reel.caption}
            </p>
            {reel.caption.length > 80 && (
              <button
                onClick={() => setCaptionExpanded(!captionExpanded)}
                className="relative text-white/40 text-xs font-medium flex items-center gap-0.5 mt-0.5 before:content-[''] before:absolute before:-inset-x-2 before:-inset-y-3.5"
              >
                {captionExpanded ? <>less <ChevronUp className="w-3 h-3" /></> : <>more <ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
        )}

        {shareCopied && (
        <div className="absolute bottom-[180px] left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold no-select">
          Link copied
        </div>
      )}

      {/* Music credit — the TikTok ♫ line */}
        {reel.musicTrackTitle && (
          <p className="mb-1.5 flex items-center gap-1.5 text-white/70 text-xs font-medium">
            <span aria-hidden>♫</span>
            <span className="truncate">{reel.musicTrackTitle}</span>
          </p>
        )}

        {/* Clickable hashtags — link to search */}
        {reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {reel.hashtags.map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`/search?q=%23${tag}`)}
                className="text-brand-300 text-xs font-medium hover:text-brand-200 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* More from creator CTA */}
        {reel.creator && (
          <button
            onClick={() => router.push(`/profile/${reel.creator!.username}`)}
            className="flex items-center gap-2 mb-2"
          >
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {reel.creator.avatarUrl ? (
                <img src={reel.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-white/40">{reel.creator.displayName.charAt(0)}</span>
              )}
            </div>
            <span className="text-white/40 text-xs">More from {reel.creator.displayName}</span>
          </button>
        )}

        {/* Music ticker */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-[11px]">&#9835;</span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-white/40 text-xs whitespace-nowrap">
              Original Sound &mdash; {reel.creator?.displayName || 'Creator'}
            </p>
          </div>
        </div>
      </div>

      {/* Spending/subscribe prompt — shows after 15s watch */}
      {reel.creator && (
        <ReelSpendingPrompt
          creatorId={reel.creatorId}
          creatorName={reel.creator.displayName}
          creatorUsername={reel.creator.username}
          watchTimeMs={watchTimeMs}
          isActive={isActive}
        />
      )}

      {/* Follow prompt — shows after 20s watch */}
      <AnimatePresence>
        {showFollowPrompt && !liked && reel.creator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-28 left-4 right-16 z-30"
          >
            <div className="glass-card rounded-2xl p-3 flex items-center gap-3 glisten overflow-hidden">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {reel.creator.avatarUrl ? (
                  <img src={reel.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                    {reel.creator.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">Follow {reel.creator.displayName}?</p>
                <p className="text-white/30 text-[11px]">Your people are here — join the room</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { handleFollow(); setShowFollowPrompt(false); }}
                className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-bold flex-shrink-0"
              >
                Follow
              </motion.button>
              <button onClick={() => setShowFollowPrompt(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 text-white/20 text-xs">
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report / block sheet */}
      <ReportSheet
        open={showReport}
        onClose={() => setShowReport(false)}
        targetCreatorId={reel.creatorId}
        targetReelId={reel.id}
        targetName={reel.creator?.username}
        onBlocked={({ creatorId }) => { if (creatorId) onBlocked?.(creatorId); }}
      />
    </div>
  );
}
