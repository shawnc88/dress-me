import { useState, useCallback, useRef } from 'react';
import { playGiftSound } from './giftSounds';

/** Returns true when the user has opted into reduced motion at the OS level. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export type AnimationType = 'hearts' | 'explosion' | 'diamond' | null;
export type ExplosionTier = 'gold' | 'silver' | 'bronze';

export interface ActiveAnimation {
  id: number;
  type: AnimationType;
  tier: ExplosionTier;
  duration: number;
}

/** Maps gift types to 3D animation configs. */
const GIFT_ANIMATION_MAP: Record<
  string,
  { type: AnimationType; tier: ExplosionTier; duration: number }
> = {
  heart:     { type: 'hearts',    tier: 'bronze', duration: 3500 },
  rose:      { type: 'hearts',    tier: 'bronze', duration: 3500 },
  outfit:    { type: 'explosion', tier: 'bronze', duration: 3000 },
  spotlight: { type: 'explosion', tier: 'silver', duration: 3000 },
  crown:     { type: 'explosion', tier: 'gold',   duration: 4000 },
  diamond:   { type: 'diamond',   tier: 'gold',   duration: 5000 },
};

/** Concurrent-animation caps scale inversely with tier. Bronze tips happen
 *  often and stacking them is the chat vibe; gold/silver get tighter caps
 *  so each premium gift owns the moment instead of fighting another. */
const MAX_CONCURRENT_BY_TIER: Record<ExplosionTier, number> = {
  bronze: 8,
  silver: 4,
  gold: 2,
};

export function useGiftAnimation() {
  const [animations, setAnimations] = useState<ActiveAnimation[]>([]);
  const counterRef = useRef(0);

  const trigger = useCallback((giftType: string) => {
    // Respect OS-level reduced-motion preference. Gifts still register in
    // chat overlays — we just skip the 3D burst that could nauseate users
    // with motion sensitivity. Also an App Store accessibility check.
    if (prefersReducedMotion()) return;

    const config = GIFT_ANIMATION_MAP[giftType];
    if (!config || !config.type) return;

    const id = ++counterRef.current;
    const anim: ActiveAnimation = { id, ...config };

    setAnimations((prev) => {
      // Cap how many animations of THIS tier can be concurrent. Older
      // animations of the same tier get evicted; other tiers untouched.
      const cap = MAX_CONCURRENT_BY_TIER[anim.tier];
      const sameTier = prev.filter((a) => a.tier === anim.tier);
      const others = prev.filter((a) => a.tier !== anim.tier);
      const trimmed = sameTier.length >= cap ? sameTier.slice(-(cap - 1)) : sameTier;
      return [...others, ...trimmed, anim];
    });

    // Fire the audio cue. Fire-and-forget; failures (autoplay blocked,
    // user has system audio muted) silently no-op via giftSounds.ts guards.
    void playGiftSound(anim.tier);

    // Auto-cleanup after duration
    setTimeout(() => {
      setAnimations((prev) => prev.filter((a) => a.id !== id));
    }, anim.duration);
  }, []);

  const clear = useCallback(() => setAnimations([]), []);

  return { animations, trigger, clear };
}
