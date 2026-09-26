import { env } from '../config/env';

// ─── The one revenue rule ───────────────────────────────────────────
// Creators keep CREATOR_SHARE of NET RECEIPTS — the money that actually
// lands in our account — never of the sticker price. Sharing gross paid
// out more than Apple remits and lost money on every iOS membership.

export const CREATOR_SHARE = 0.8;

// Stripe's standard card fee: 2.9% + 30¢.
function stripeNetCents(grossCents: number): number {
  return Math.max(0, Math.round(grossCents * 0.971) - 30);
}

// What each store remits to us. APPLE_STORE_RATE is env-driven so Small
// Business Program approval (30% → 15% cut) is a Render dashboard flip
// to 0.85, not a deploy.
export function netReceiptsCents(grossCents: number, provider: string): number {
  if (provider === 'APPLE_IAP') return Math.round(grossCents * env.APPLE_STORE_RATE);
  if (provider === 'STRIPE') return stripeNetCents(grossCents);
  return grossCents;
}

export function creatorNetCents(grossCents: number, provider: string): number {
  return Math.round(netReceiptsCents(grossCents, provider) * CREATOR_SHARE);
}

// Gift threads convert at the full payout rate — the platform margin on
// gifting lives in the coin-pack spread, never in a fee at gift time.
// Same headline rate as Bigo (210 Beans = $1), worth saying out loud.
export const CREATOR_PAYOUT_RATE = 210; // threads per $1

export function threadsToCents(threads: number): number {
  return Math.round((threads * 100) / CREATOR_PAYOUT_RATE);
}
