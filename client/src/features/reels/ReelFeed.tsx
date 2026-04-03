import { useState, useEffect, useRef, useCallback } from 'react';
import { ReelCard } from './ReelCard';

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

export function ReelFeed() {
  const [reels, setReels] = useState<ReelData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/reels/suggested`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reels) setReels(data.reels);
      })
      .catch(() => {});
  }, []);

  // Snap scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

  if (reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <p className="text-white/40 text-sm">No reels yet</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
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
            onComment={() => {}}
          />
        </div>
      ))}
    </div>
  );
}
