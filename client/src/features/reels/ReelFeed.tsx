import { useState, useEffect, useRef, useCallback } from 'react';
import { Film } from 'lucide-react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchStartRef = useRef<number>(Date.now());
  const activeIndexRef = useRef(0);
  const reelsRef = useRef<ReelData[]>([]);
  const seenIdsRef = useRef(new Set<string>());

  // Keep refs in sync
  activeIndexRef.current = activeIndex;
  reelsRef.current = reels;

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_URL}/api/reels/suggested`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reels) {
          const unique = dedupeReels(data.reels, seenIdsRef.current);
          setReels(unique);
        }
      })
      .catch(() => {});
  }, []);

  // Infinite scroll — load more when near end
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const currentReels = reelsRef.current;
    if (currentReels.length === 0) return;

    setLoadingMore(true);
    try {
      const lastId = currentReels[currentReels.length - 1].id;
      const res = await fetch(`${API_URL}/api/reels?cursor=${lastId}&limit=10`);
      const data = await res.json();
      if (data?.reels?.length) {
        const unique = dedupeReels(data.reels, seenIdsRef.current);
        if (unique.length > 0) {
          setReels(prev => [...prev, ...unique]);
        }
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore]);

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

  // Track watch time when active reel changes (uses refs to avoid stale closures)
  useEffect(() => {
    // Send watch time for PREVIOUS reel
    const prevWatchMs = Date.now() - watchStartRef.current;
    const prevReel = reelsRef.current[activeIndexRef.current];
    // Note: activeIndexRef just got updated, so the previous reel is already gone.
    // We need to track on the cleanup side. Let's reset the timer.
    watchStartRef.current = Date.now();

    return () => {
      const watchTimeMs = Date.now() - watchStartRef.current;
      const reel = reelsRef.current[activeIndexRef.current];
      if (!reel || watchTimeMs < 500) return;

      const token = localStorage.getItem('token');
      const isSkip = watchTimeMs < 2000;

      // Send view with watch time
      fetch(`${API_URL}/api/reels/${reel.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ watchTimeMs }),
      }).catch(() => {});

      // Track personalized feed signal
      if (token) {
        fetch(`${API_URL}/api/feed/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            contentId: reel.id,
            contentType: 'reel',
            creatorId: reel.creatorId,
            event: isSkip ? 'skip' : 'view',
            watchTimeMs,
          }),
        }).catch(() => {});
      }
    };
  }, [activeIndex]);

  // Trigger infinite scroll when near end
  useEffect(() => {
    if (reels.length > 0 && activeIndex >= reels.length - 3) {
      loadMore();
    }
  }, [activeIndex, reels.length, loadMore]);

  if (reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <div className="text-center">
          <Film className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No reels yet</p>
          <p className="text-white/20 text-xs mt-1">Check back soon</p>
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

      {showComments && reels[activeIndex] && (
        <ReelComments reelId={reels[activeIndex].id} onClose={() => setShowComments(false)} />
      )}
    </>
  );
}

// Deduplicate reels and track seen IDs
function dedupeReels(newReels: ReelData[], seenIds: Set<string>): ReelData[] {
  const unique: ReelData[] = [];
  for (const r of newReels) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      unique.push(r);
    }
  }
  return unique;
}
