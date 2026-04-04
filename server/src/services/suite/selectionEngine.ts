import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

interface CandidateInput {
  userId: string;
  tierName: 'SUPPORTER' | 'VIP' | 'INNER_CIRCLE';
  subscribedSince: Date;
  engagementScore?: number;
}

interface WeightedCandidate extends CandidateInput {
  weight: number;
}

// Tier weight multipliers
const TIER_WEIGHTS: Record<string, number> = {
  SUPPORTER: 1,
  VIP: 3,
  INNER_CIRCLE: 10,
};

// Tenure bonus: +1 per month subscribed (max +12)
function tenureBonus(subscribedSince: Date): number {
  const months = Math.floor((Date.now() - subscribedSince.getTime()) / (30 * 24 * 60 * 60 * 1000));
  return Math.min(months, 12);
}

/**
 * Build candidate list from active subscribers for a given creator + stream.
 */
export async function buildCandidateList(
  creatorId: string,
  streamId: string,
  suiteId: string,
  minTier: 'SUPPORTER' | 'VIP' | 'INNER_CIRCLE' = 'VIP',
): Promise<{ eligible: number; total: number }> {
  // Get all active subscribers for this creator
  const subs = await prisma.fanSubscription.findMany({
    where: { creatorId, status: 'ACTIVE' },
    include: { tier: true, user: { select: { id: true } } },
  });

  const minWeight = TIER_WEIGHTS[minTier] || 1;
  let eligible = 0;

  // Check for blocked users
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: creatorId },
    select: { blockedId: true },
  });
  const blockedIds = new Set(blocks.map(b => b.blockedId));

  // Check for past participation (lower priority for repeat guests)
  const pastSelections = await prisma.suiteSelection.findMany({
    where: { suite: { creatorId } },
    select: { selectedUserIds: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const recentParticipants = new Set(pastSelections.flatMap(s => s.selectedUserIds));

  // Build candidate data in memory first (no DB calls in loop)
  const candidateData: Array<{
    userId: string; tierId: string; tierName: string;
    eligible: boolean; weightScore: number; reason?: string;
  }> = [];

  for (const sub of subs) {
    const tierWeight = TIER_WEIGHTS[sub.tier.name] || 0;
    const meetsMinTier = tierWeight >= minWeight;
    const isBlocked = blockedIds.has(sub.userId);
    const isEligible = meetsMinTier && !isBlocked;

    let weightScore = 0;
    let reason: string | undefined;

    if (!meetsMinTier) {
      reason = `Tier ${sub.tier.name} below minimum ${minTier}`;
    } else if (isBlocked) {
      reason = 'Blocked by creator';
    } else {
      weightScore = tierWeight * 10;
      weightScore += tenureBonus(sub.startedAt);
      if (recentParticipants.has(sub.userId)) {
        weightScore = Math.max(1, weightScore * 0.5);
      }
      eligible++;
    }

    candidateData.push({
      userId: sub.userId,
      tierId: sub.tierId,
      tierName: sub.tier.name,
      eligible: isEligible,
      weightScore,
      reason,
    });
  }

  // Batch write: delete existing candidates for this suite, then createMany
  // This is much faster than N individual upserts for large subscriber counts
  await prisma.$transaction([
    prisma.suiteCandidate.deleteMany({ where: { suiteId } }),
    prisma.suiteCandidate.createMany({
      data: candidateData.map(c => ({
        suiteId,
        userId: c.userId,
        tierId: c.tierId,
        tierName: c.tierName as any,
        eligible: c.eligible,
        weightScore: c.weightScore,
        reason: c.reason,
      })),
      skipDuplicates: true,
    }),
  ]);

  return { eligible, total: subs.length };
}

/**
 * Manual selection — creator picks specific fans.
 */
export async function manualSelect(
  suiteId: string,
  selectedUserIds: string[],
): Promise<void> {
  await prisma.suiteSelection.create({
    data: {
      suiteId,
      selectedUserIds,
      mode: 'MANUAL',
    },
  });
  logger.info(`Suite ${suiteId}: manual selection of ${selectedUserIds.length} fans`);
}

/**
 * Weighted selection — pick N fans weighted by score.
 */
export async function weightedSelect(
  suiteId: string,
  count: number,
): Promise<string[]> {
  const candidates = await prisma.suiteCandidate.findMany({
    where: { suiteId, eligible: true },
    orderBy: { weightScore: 'desc' },
  });

  if (candidates.length === 0) return [];

  // Weighted random sampling
  const totalWeight = candidates.reduce((sum, c) => sum + c.weightScore, 0);
  const selected: string[] = [];
  const remaining = [...candidates];

  for (let i = 0; i < Math.min(count, remaining.length); i++) {
    const currentTotal = remaining.reduce((sum, c) => sum + c.weightScore, 0);
    let random = Math.random() * currentTotal;

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weightScore;
      if (random <= 0) {
        selected.push(remaining[j].userId);
        remaining.splice(j, 1);
        break;
      }
    }
  }

  await prisma.suiteSelection.create({
    data: {
      suiteId,
      selectedUserIds: selected,
      mode: 'WEIGHTED',
    },
  });

  logger.info(`Suite ${suiteId}: weighted selection of ${selected.length} fans`);
  return selected;
}

/**
 * Randomized draw with compliance-aware rules.
 * Uses crypto.randomBytes for auditable randomness.
 */
export async function randomizedSelect(
  suiteId: string,
  count: number,
): Promise<string[]> {
  const candidates = await prisma.suiteCandidate.findMany({
    where: { suiteId, eligible: true },
  });

  if (candidates.length === 0) return [];

  // Fisher-Yates shuffle with crypto randomness
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const j = randomBytes.readUInt32BE(0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, count).map(c => c.userId);

  await prisma.suiteSelection.create({
    data: {
      suiteId,
      selectedUserIds: selected,
      mode: 'RANDOMIZED',
    },
  });

  logger.info(`Suite ${suiteId}: randomized selection of ${selected.length} fans`);
  return selected;
}
