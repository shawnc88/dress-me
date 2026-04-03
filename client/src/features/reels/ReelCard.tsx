import { useRef, useEffect, useState } from 'react';
import { ReelActions } from './ReelActions';
import MuxPlayer from '@mux/mux-player-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ReelData {
  id: string;
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
  const viewTracked = useRef(false);

  // Track view when active
  useEffect(() => {
    if (!isActive || viewTracked.current) return;
    viewTracked.current = true;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/reels/${reel.id}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ watchTimeMs: 3000 }),
    }).catch(() => {});
  }, [isActive, reel.id]);

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
  }

  function handleShare() {
    fetch(`${API_URL}/api/reels/${reel.id}/share`, { method: 'POST' }).catch(() => {});
    if (navigator.share) {
      navigator.share({ title: reel.caption || 'Check this out', url: `${window.location.origin}/reels/${reel.id}` }).catch(() => {});
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
          muted
          className="w-full h-full object-cover"
        />
      )}

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Right actions */}
      <div className="absolute right-3 bottom-32 z-20">
        <ReelActions
          liked={liked}
          likesCount={likesCount}
          commentsCount={reel.commentsCount}
          sharesCount={reel.sharesCount}
          onLike={handleLike}
          onComment={onComment}
          onShare={handleShare}
          onFollow={() => {}}
          showFollow
        />
      </div>

      {/* Bottom: creator + caption */}
      <div className="absolute bottom-6 left-4 right-16 z-10">
        {reel.creator && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
              {reel.creator.avatarUrl ? (
                <img src={reel.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                  {reel.creator.displayName.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-white text-sm font-bold">@{reel.creator.username}</span>
          </div>
        )}
        {reel.caption && (
          <p className="text-white text-sm mb-1 line-clamp-2">{reel.caption}</p>
        )}
        {reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reel.hashtags.map(tag => (
              <span key={tag} className="text-brand-400 text-xs font-medium">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
