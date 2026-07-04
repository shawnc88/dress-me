/**
 * Live Effects — shared catalog (single source of truth).
 *
 * Unifies gift + tier metadata that was previously duplicated across
 * GiftPanel.tsx, GiftAnimationOverlay.tsx, and useGiftAnimation.ts.
 *
 * GROUND TRUTH: the gift `id`s and `cost`s here MUST match the server's
 * authoritative price map (`server/src/routes/threads.ts` GIFT_PRICE_BY_TYPE).
 * The server is authoritative on price; this catalog is the client-side
 * contract for how each gift LOOKS and which renderer plays it. Changing an
 * id or cost is a coordinated client+server change.
 *
 * `renderer` is the hybrid dispatch: 'r3f' = existing WebGL particle scene
 * (today's behavior), later 'lottie' (common gifts) / 'glb' (elite hero gifts).
 */

export type EffectTier = 'bronze' | 'silver' | 'gold';
export type GiftRenderer = 'r3f' | 'lottie' | 'glb';
export type R3FAnimation = 'hearts' | 'explosion' | 'diamond';

export interface GiftDef {
  /** Server-contract id (do not rename without a server change). */
  id: string;
  /** Display name shown in panel + callouts. */
  label: string;
  emoji: string;
  /** Server-authoritative Threads cost (mirror of GIFT_PRICE_BY_TYPE). */
  cost: number;
  /** Effect tier — drives particle count, caps, bloom, sound. */
  tier: EffectTier;
  /** Which renderer plays this gift (hybrid dispatch). */
  renderer: GiftRenderer;
  /** r3f particle animation (when renderer === 'r3f'). */
  r3f: R3FAnimation;
  /** Accent hue for 2D chrome (from the universal spectrum). */
  color: string;
}

/**
 * The 6 gifts — values mirror today's GiftPanel + useGiftAnimation exactly
 * (zero visual regression). All `renderer: 'r3f'` for now; the hybrid pass
 * flips common gifts to 'lottie' and elite gifts to 'glb'.
 */
export const GIFTS: GiftDef[] = [
  { id: 'heart',     label: 'Heart',     emoji: '❤️', cost: 1,    tier: 'bronze', renderer: 'r3f', r3f: 'hearts',    color: '#FF4FA3' },
  { id: 'rose',      label: 'Rose',      emoji: '🌹', cost: 10,   tier: 'silver', renderer: 'r3f', r3f: 'hearts',    color: '#FF4FA3' },
  { id: 'outfit',    label: 'Star',      emoji: '⭐', cost: 50,   tier: 'bronze', renderer: 'r3f', r3f: 'explosion', color: '#FFD84D' },
  { id: 'spotlight', label: 'Spotlight', emoji: '🔥', cost: 200,  tier: 'silver', renderer: 'r3f', r3f: 'explosion', color: '#FF7A2F' },
  { id: 'crown',     label: 'Crown',     emoji: '👑', cost: 500,  tier: 'gold',   renderer: 'r3f', r3f: 'explosion', color: '#FFB020' },
  { id: 'diamond',   label: 'Diamond',   emoji: '💎', cost: 1000, tier: 'gold',   renderer: 'r3f', r3f: 'diamond',   color: '#22E0D6' },
];

const GIFT_BY_ID: Record<string, GiftDef> = Object.fromEntries(GIFTS.map((g) => [g.id, g]));

/** Look up a gift by id; falls back to a generic bronze r3f burst for unknown ids. */
export function getGift(id: string): GiftDef {
  return (
    GIFT_BY_ID[id] ?? {
      id, label: id, emoji: '🎁', cost: 0, tier: 'bronze', renderer: 'r3f', r3f: 'explosion', color: '#FF4FA3',
    }
  );
}

/* ─── Subscriber tiers (drive entrance effects + tier-aware gifts) ─── */

export type SubscriberTier = 'SUPPORTER' | 'VIP' | 'INNER_CIRCLE';

export interface TierDef {
  id: SubscriberTier;
  label: string;
  /** Higher = more elite → flashier entrance. */
  rank: number;
  /** Accent hue (universal spectrum). */
  color: string;
  /** Tailwind box-shadow token for the glow. */
  glow: string;
  /** Whether this tier gets a full entrance effect (keeps the room from spamming). */
  entrance: boolean;
}

export const TIERS: Record<SubscriberTier, TierDef> = {
  SUPPORTER:    { id: 'SUPPORTER',    label: 'Supporter',    rank: 1, color: '#38D6FF', glow: 'shadow-glow-cyan',  entrance: true },
  VIP:          { id: 'VIP',          label: 'VIP',          rank: 2, color: '#7C5CFF', glow: 'shadow-glow-violet', entrance: true },
  INNER_CIRCLE: { id: 'INNER_CIRCLE', label: 'Inner Circle', rank: 3, color: '#FFB020', glow: 'shadow-glow-amber',  entrance: true },
};

/** Normalize a server tier value (string | null) into a TierDef, or null. */
export function getTier(tier?: string | null): TierDef | null {
  if (!tier) return null;
  return TIERS[tier as SubscriberTier] ?? null;
}
