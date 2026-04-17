import { useState, useCallback, useRef } from 'react';

export type AnimationType = 'hearts' | 'explosion' | 'diamond' | null;
export type ExplosionTier = 'gold' | 'silver' | 'bronze';

export interface ActiveAnimation {
  id: number;
  type: AnimationType;
  tier: ExplosionTier;
  duration: number;
}

/** Maps gift types to 3D animation configs */
const GIFT_ANIMATION_MAP: Record<string, { type: AnimationType; tier: ExplosionTier; duration: number }> = {
  heart:     { type: 'hearts',    tier: 'bronze', duration: 3500 },
  rose:      { type: 'hearts',    tier: 'bronze', duration: 3500 },
  outfit:    { type: 'explosion', tier: 'bronze', duration: 3000 },
  spotlight: { type: 'explosion', tier: 'silver', duration: 3000 },
  crown:     { type: 'explosion', tier: 'gold',   duration: 4000 },
  diamond:   { type: 'diamond',   tier: 'gold',   duration: 5000 },
};

const MAX_CONCURRENT = 3;

export function useGiftAnimation() {
  const [animations, setAnimations] = useState<ActiveAnimation[]>([]);
  const counterRef = useRef(0);

  const trigger = useCallback((giftType: string) => {
    const config = GIFT_ANIMATION_MAP[giftType];
    if (!config || !config.type) return;

    const id = ++counterRef.current;
    const anim: ActiveAnimation = { id, ...config };

    setAnimations((prev) => {
      // Cap concurrent animations to prevent GPU overload
      const next = prev.length >= MAX_CONCURRENT ? prev.slice(1) : prev;
      return [...next, anim];
    });

    // Auto-cleanup after duration
    setTimeout(() => {
      setAnimations((prev) => prev.filter((a) => a.id !== id));
    }, anim.duration);
  }, []);

  const clear = useCallback(() => setAnimations([]), []);

  return { animations, trigger, clear };
}
