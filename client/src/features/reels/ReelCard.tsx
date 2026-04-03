import { useRef, useEffect, useState } from 'react';
import { ReelActions } from './ReelActions';
import { Volume2, VolumeX } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [soundOn, setSoundOn] = useState(false);

  function handleLike() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLiked(!liked);
    setLikesCount(c => liked ? c - 1 : c + 1);
    fetch(`${API_URL}/api/reels/${reel.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {
      setLiked(l => !l);
      setLikesCount(c => liked ? c + 1 : c - 1);
    });

    // Track like signal
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
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/feed/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentId: reel.id, contentType: 'reel', creatorId: reel.creatorId, event: 'share' }),
      }).catch(() => {});
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

  function toggleSound() {
    const muxEl = document.querySelector('mux-player') as any;
    const video = muxEl?.shadowRoot?.querySelector('video') || document.querySelector('video');
    if (video) {
      if (soundOn) {
        video.muted = true;
        setSoundOn(false);
      } else {
        video.muted = false;
        video.volume = 1;
        video.play().catch(() => {});
        setSoundOn(true);
      }
    }
  }

  return (
    <div className="relative w-full h-full bg-black">
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

      {/* Sound toggle — top right */}
      <button
        onClick={toggleSound}
        style={{ zIndex: 9999 }}
        className="absolute top-16 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
      >
        {soundOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
      </button>

      {/* Right actions */}
      <div className="absolute right-3 bottom-36 z-20">
        {/* Creator avatar */}
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
            <button
              onClick={handleFollow}
              className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center -mt-2.5 border border-white text-white text-[10px] font-bold"
            >
              +
            </button>
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

      {/* Bottom: caption + hashtags + music */}
      <div className="absolute bottom-6 left-4 right-16 z-10 safe-area-pb">
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
        {/* Music ticker */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-[8px]">♪</span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-white/40 text-xs whitespace-nowrap animate-marquee">
              Original Sound — {reel.creator?.displayName || 'Creator'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
