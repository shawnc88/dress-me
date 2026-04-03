import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReelActions } from './ReelActions';
import { Volume2, VolumeX, Heart } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Persist sound preference across reels
let globalSoundOn = false;

interface ReelData {
  id: string;
  creatorId: string;
  videoUrl: string;
  muxPlaybackId?: string;
  caption?: string;
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
}

export function ReelCard({ reel, isActive, onComment }: ReelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [soundOn, setSoundOn] = useState(globalSoundOn);
  const [showHeart, setShowHeart] = useState(false);
  const [paused, setPaused] = useState(false);
  const lastTapRef = useRef(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!card) return;
      const video = findVideo(card);
      if (video) video.pause();
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
  }

  function handleLike() {
    const token = localStorage.getItem('token');
    if (!token) return;
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
    if (navigator.share) {
      navigator.share({ title: reel.caption || 'Check this out', url: `${window.location.origin}/reels/${reel.id}` }).catch(() => {});
    }
  }

  function handleFollow() {
    const token = localStorage.getItem('token');
    if (!token || !reel.creator) return;
    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId: reel.creatorId }),
    }).catch(() => {});
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
          setPaused(false);
        } else {
          video.pause();
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
        <MuxPlayer
          playbackId={reel.muxPlaybackId}
          streamType="on-demand"
          autoPlay={isActive ? 'muted' : false}
          playsInline
          loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
          primaryColor="#ec4899"
        />
      ) : (
        <video
          src={reel.videoUrl}
          autoPlay={isActive}
          playsInline
          loop
          muted={!soundOn}
          className="w-full h-full object-cover"
        />
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
        className="absolute top-16 right-3 z-30 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        {soundOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
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
              className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center -mt-2.5 border border-white text-white text-[10px] font-bold"
            >
              +
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

      {/* Bottom info — z-20 above touch zone, below action buttons */}
      <div className="absolute bottom-6 left-4 right-16 z-20 safe-area-pb">
        {reel.creator && (
          <p className="text-white text-sm font-bold mb-1">@{reel.creator.username}</p>
        )}
        {reel.caption && (
          <p className="text-white/90 text-sm mb-1.5 line-clamp-2">{reel.caption}</p>
        )}
        {reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {reel.hashtags.map(tag => (
              <span key={tag} className="text-brand-300 text-xs font-medium">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-[8px]">&#9835;</span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-white/40 text-xs whitespace-nowrap">
              Original Sound &mdash; {reel.creator?.displayName || 'Creator'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
