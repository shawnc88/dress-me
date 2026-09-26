import { prisma } from '../utils/prisma';

// ─── Viewer flair: fan-club membership + wealth/spend level ──────
// Status is the product in gift economies. A viewer's accumulated spend
// becomes a visible, permanent badge — that's why whales keep spending.
// Cached 60s per user (same policy as getSubscriptionBadge).

const LEVELS = [500, 2000, 5000, 15000, 50000]; // lifetime threads → Lv 1..5

export function spendLevel(totalThreads: number): number {
  let lvl = 0;
  for (const threshold of LEVELS) {
    if (totalThreads >= threshold) lvl++;
    else break;
  }
  return lvl;
}

interface Flair {
  level: number;   // 0..5 wealth level from lifetime gift spend
  club: boolean;   // member of THIS creator's fan club
}

const cache = new Map<string, { flair: Flair; expiresAt: number }>();

export async function getViewerFlair(userId: string, creatorId?: string | null): Promise<Flair> {
  const key = `${userId}:${creatorId || 'any'}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.flair;

  let flair: Flair = { level: 0, club: false };
  try {
    const [spend, clubRow] = await Promise.all([
      prisma.gift.aggregate({ where: { senderId: userId }, _sum: { threads: true } }),
      creatorId
        ? prisma.fanClubMember.findUnique({
            where: { creatorId_userId: { creatorId, userId } },
          })
        : null,
    ]);
    flair = { level: spendLevel(spend._sum.threads || 0), club: !!clubRow };
  } catch {}

  cache.set(key, { flair, expiresAt: Date.now() + 60_000 });
  return flair;
}

/** Invalidate after a join so the badge shows on the very next message. */
export function invalidateFlair(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}
