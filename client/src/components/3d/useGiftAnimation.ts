import { useState, useCallback, useRef } from 'react';
import { playGiftSound } from './giftSounds';
import type { SenderInfo, ComboInfo } from './GiftHud';

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
  /** Sender shown in the HUD callout. Optional — system-triggered animations skip this. */
  sender?: SenderInfo;
  /** Combo count *at the moment this animation fired* — drives particle
   *  count + emissive amplification in the renderer. */
  comboCount: number;
}

/** Maps gift types to 3D animation configs. */
const GIFT_ANIMATION_MAP: Record<
  string,
  { type: AnimationType; tier: ExplosionTier; duration: number }
> = {
  heart:     { type: 'hearts',    tier: 'bronze', duration: 3500 },
  rose:      { type: 'hearts',    tier: 'silver', duration: 4500 },
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

const COMBO_WINDOW_MS = 3000;

interface ComboState {
  type: string;
  count: number;
  expiresAt: number;
}

export function useGiftAnimation() {
  const [animations, setAnimations] = useState<ActiveAnimation[]>([]);
  // Combo state is exposed for HUD rendering. Live in a ref + mirrored state
  // so the hot path (combo lookup) doesn't trigger a render on its own — the
  // setState call after is the single re-render per trigger.
  const combosRef = useRef<Map<string, ComboState>>(new Map());
  const [latestCombo, setLatestCombo] = useState<ComboInfo | null>(null);
  const [latestSender, setLatestSender] = useState<SenderInfo | null>(null);
  const counterRef = useRef(0);
  const senderClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback((giftType: string, sender?: SenderInfo) => {
    // Respect OS-level reduced-motion — silent + animation-free for users
    // with motion sensitivity. Required for App Store accessibility review.
    if (prefersReducedMotion()) return;

    const config = GIFT_ANIMATION_MAP[giftType];
    if (!config || !config.type) return;

    // ── Combo tracking ─────────────────────────────────────
    const now = Date.now();
    // Garbage-collect expired combos
    for (const [k, c] of combosRef.current) {
      if (c.expiresAt <= now) combosRef.current.delete(k);
    }
    const prev = combosRef.current.get(giftType);
    const comboCount = prev && prev.expiresAt > now ? prev.count + 1 : 1;
    combosRef.current.set(giftType, {
      type: giftType,
      count: comboCount,
      expiresAt: now + COMBO_WINDOW_MS,
    });

    // Update HUD state
    setLatestCombo({ type: giftType, count: comboCount });
    if (comboClearRef.current) clearTimeout(comboClearRef.current);
    comboClearRef.current = setTimeout(() => {
      // Drop the combo display when the window expires
      setLatestCombo((curr) =>
        curr && curr.type === giftType ? null : curr,
      );
    }, COMBO_WINDOW_MS);

    if (sender) {
      setLatestSender(sender);
      if (senderClearRef.current) clearTimeout(senderClearRef.current);
      senderClearRef.current = setTimeout(() => {
        setLatestSender(null);
      }, Math.max(config.duration, 3000));
    }

    // ── Spawn animation ────────────────────────────────────
    const id = ++counterRef.current;
    const anim: ActiveAnimation = {
      id,
      type: config.type,
      tier: config.tier,
      duration: config.duration,
      sender,
      comboCount,
    };

    setAnimations((prevList) => {
      const cap = MAX_CONCURRENT_BY_TIER[anim.tier];
      const sameTier = prevList.filter((a) => a.tier === anim.tier);
      const others = prevList.filter((a) => a.tier !== anim.tier);
      const trimmed = sameTier.length >= cap ? sameTier.slice(-(cap - 1)) : sameTier;
      return [...others, ...trimmed, anim];
    });

    // Fire the audio cue (silent no-op on autoplay-blocked / muted).
    void playGiftSound(anim.tier);

    // Auto-cleanup after duration
    setTimeout(() => {
      setAnimations((curr) => curr.filter((a) => a.id !== id));
    }, anim.duration);
  }, []);

  const clear = useCallback(() => {
    setAnimations([]);
    setLatestCombo(null);
    setLatestSender(null);
    combosRef.current.clear();
  }, []);

  return { animations, trigger, clear, latestCombo, latestSender };
}
