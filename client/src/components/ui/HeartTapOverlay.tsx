import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket, getSocket } from '@/utils/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FloatingHeart {
  id: number;
  color: string;
  size: number;
  driftX: number;
  startX: number;
  delay: number;
}

// Instagram/TikTok palette — pinks, reds, coral
const HEART_COLORS = [
  '#ef4444', '#f43f5e', '#ec4899', '#fb7185',
  '#f87171', '#db2777', '#e11d48',
];

// Cap the DOM hearts to avoid runaway lists during raid-tap spikes
const MAX_HEARTS = 60;
const HEART_DURATION_MS = 2600;

let globalCounter = 0;

function makeHeart(xPercent?: number): FloatingHeart {
  return {
    id: ++globalCounter,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    size: 18 + Math.floor(Math.random() * 14), // 18-32px
    driftX: (Math.random() - 0.5) * 80,         // -40 to +40 px horizontal drift
    startX: xPercent ?? 85 + Math.random() * 10, // default right-side, like Instagram
    delay: Math.floor(Math.random() * 100),
  };
}

interface HeartTapOverlayProps {
  streamId: string | undefined;
  /**
   * Optional ref — parent can call `.tap()` to spawn a local heart without
   * hitting the server (useful for optimistic feedback on button press).
   */
  controlRef?: React.MutableRefObject<{ tap: () => void; tapBurst: (n?: number) => void } | null>;
}

/**
 * Floating hearts overlay for live streams — lightweight DOM/CSS, not three.js.
 *
 * Renders small heart SVGs that float up from the bottom of the container,
 * fade out around 80% up, drift slightly left/right. Triggered by:
 *   1) Local calls via `controlRef.current.tap()` (instant, no network)
 *   2) Incoming `heart:tapped` Socket.IO events (other viewers' taps)
 *
 * Designed to handle 5-15 concurrent hearts smoothly on low-end iPhones.
 */
export function HeartTapOverlay({ streamId, controlRef }: HeartTapOverlayProps) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const addHeart = useCallback((xPercent?: number) => {
    setHearts((prev) => {
      const next = makeHeart(xPercent);
      // Cap total concurrent hearts
      const capped = prev.length >= MAX_HEARTS ? prev.slice(prev.length - MAX_HEARTS + 1) : prev;
      return [...capped, next];
    });
  }, []);

  // Remove heart from list after animation completes
  useEffect(() => {
    if (hearts.length === 0) return;
    const oldest = hearts[0];
    const timer = setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== oldest.id));
    }, HEART_DURATION_MS + oldest.delay + 100);
    return () => clearTimeout(timer);
  }, [hearts]);

  // Expose tap / tapBurst to parent via ref
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      tap: () => addHeart(),
      tapBurst: (n = 8) => {
        for (let i = 0; i < n; i++) {
          setTimeout(() => addHeart(), i * 60);
        }
      },
    };
    return () => { if (controlRef) controlRef.current = null; };
  }, [controlRef, addHeart]);

  // Listen for heart:tapped from server (other viewers' taps)
  useEffect(() => {
    if (!streamId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = getSocket() ?? connectSocket(token);
    socket.emit('join-stream', streamId);

    function onTap(payload: { streamId: string }) {
      if (payload.streamId !== streamId) return;
      addHeart();
    }
    socket.on('heart:tapped', onTap);
    return () => { socket.off('heart:tapped', onTap); };
  }, [streamId, addHeart]);

  if (!streamId) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden" aria-hidden="true">
      {hearts.map((h) => (
        <HeartBubble key={h.id} heart={h} />
      ))}
      <style jsx>{`
        @keyframes heart-float {
          0%   { transform: translate(0, 0) scale(0.5); opacity: 0; }
          10%  { transform: translate(0, -10%) scale(1.1); opacity: 1; }
          40%  { transform: translate(var(--drift-40), -45%) scale(1); opacity: 1; }
          80%  { transform: translate(var(--drift-80), -85%) scale(0.95); opacity: 0.6; }
          100% { transform: translate(var(--drift-100), -110%) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HeartBubble({ heart }: { heart: FloatingHeart }) {
  const style: React.CSSProperties & Record<string, string> = {
    position: 'absolute',
    left: `${heart.startX}%`,
    bottom: '5%',
    width: `${heart.size}px`,
    height: `${heart.size}px`,
    animation: `heart-float ${HEART_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${heart.delay}ms forwards`,
    '--drift-40': `${heart.driftX * 0.3}px`,
    '--drift-80': `${heart.driftX * 0.8}px`,
    '--drift-100': `${heart.driftX}px`,
    willChange: 'transform, opacity',
  };
  return (
    <div style={style}>
      <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        <path
          d="M12 21s-7.5-4.5-10-9.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 10 5.5C19.5 16.5 12 21 12 21z"
          fill={heart.color}
        />
      </svg>
    </div>
  );
}

/**
 * Fire a heart tap against the server (broadcasts to all viewers).
 * Safe to call unauthenticated — silently no-ops without a token.
 */
export async function tapHeart(streamId: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token || !streamId) return;
  try {
    await fetch(`${API_URL}/api/engagement/${streamId}/heart-tap`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* swallow — optimistic local heart already showed */
  }
}
