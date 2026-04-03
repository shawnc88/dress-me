import { useState, useEffect, useRef, useCallback } from 'react';
import { ReelCard } from './ReelCard';
import { ReelComments } from './ReelComments';

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

export function ReelFeed() {
  const [reels, setReels] = useState<ReelData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchStartRef = useRef<number>(0);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_URL}/api/reels/suggested`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reels) setReels(data.reels);
      })
      .catch(() => {});
  }, []);

  // Infinite scroll — load more when near end
  const loadMore = useCallback(async () => {
    if (loadingMore || reels.length === 0) return;
    setLoadingMore(true);
    try {
      const lastId = reels[reels.length - 1].id;
      const res = await fetch(`${API_URL}/api/reels?cursor=${lastId}&limit=10`);
      const data = await res.json();
      if (data?.reels?.length) {
        setReels(prev => [...prev, ...data.reels]);
        setCursor(data.nextCursor);
      }
    } catch {}
    setLoadingMore(false);
  }, [reels, loadingMore]);

  // Snap scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    const children = container.querySelectorAll('[data-index]');
    children.forEach(child => observer.observe(child));

    return () => observer.disconnect();
  }, [reels]);

  // Track watch time when active reel changes
  useEffect(() => {
    watchStartRef.current = Date.now();

    return () => {
      const watchTimeMs = Date.now() - watchStartRef.current;
      const reel = reels[activeIndex];
      if (!reel || watchTimeMs < 500) return;

      // Track view with watch time
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/reels/${reel.id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ watchTimeMs }),
      }).catch(() => {});

      // Track as personalized feed signal
      if (token) {
        fetch(`${API_URL}/api/feed/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            contentId: reel.id,
            contentType: 'reel',
            creatorId: reel.creatorId,
            event: 'view',
            watchTimeMs,
          }),
        }).catch(() => {});
      }
    };
  }, [activeIndex, reels]);

  // Trigger infinite scroll when near end
  useEffect(() => {
    if (activeIndex >= reels.length - 3) loadMore();
  }, [activeIndex, reels.length, loadMore]);

  if (reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <div className="text-center">
          <Film className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No reels yet</p>
          <p className="text-white/20 text-xs mt-1">Check back soon for fresh content</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
      >
        {reels.map((reel, i) => (
          <div
            key={reel.id}
            data-index={i}
            className="h-[100dvh] w-full snap-start snap-always flex-shrink-0"
          >
            <ReelCard
              reel={reel}
              isActive={i === activeIndex}
              onComment={() => setShowComments(true)}
            />
          </div>
        ))}
      </div>

      {/* Comments bottom sheet */}
      {showComments && reels[activeIndex] && (
        <ReelComments
          reelId={reels[activeIndex].id}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}

// Needed for empty state
import { Film } from 'lucide-react';
