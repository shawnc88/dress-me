import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ─── Update user preference profile from signals ────────────────

export async function updateUserPreferences(userId: string): Promise<void> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days

  const signals = await prisma.contentRankingSignal.findMany({
    where: { userId, createdAt: { gt: since } },
  });

  if (signals.length === 0) return;

  // Calculate scores from signals
  let liveScore = 0, reelsScore = 0, storyScore = 0, fashionScore = 0;
  let premiumAffinity = 0;
  const creatorAffinity: Record<string, number> = {};
  const hashtagAffinity: Record<string, number> = {};

  for (const s of signals) {
    const base = (s.watchTimeMs / 1000) * 0.1 + (s.liked ? 3 : 0) + (s.commented ? 4 : 0)
      + (s.shared ? 5 : 0) + (s.followed ? 10 : 0) + (s.subscribed ? 20 : 0)
      + (s.profileOpened ? 2 : 0) + (s.replayCount * 3) - (s.skipped ? 5 : 0);

    if (s.contentType === 'stream') liveScore += base;
    if (s.contentType === 'reel') reelsScore += base;
    if (s.contentType === 'story') storyScore += base;
    if (s.tierClicked) premiumAffinity += 5;
    if (s.subscribed) premiumAffinity += 20;

    // Creator affinity
    creatorAffinity[s.creatorId] = (creatorAffinity[s.creatorId] || 0) + base;
  }

  // Fetch hashtags from engaged reels
  const reelIds = signals.filter(s => s.contentType === 'reel' && !s.skipped).map(s => s.contentId);
  if (reelIds.length > 0) {
    const reels = await prisma.reel.findMany({
      where: { id: { in: reelIds } },
      select: { hashtags: true },
    });
    for (const r of reels) {
      for (const tag of r.hashtags) {
        hashtagAffinity[tag] = (hashtagAffinity[tag] || 0) + 1;
      }
    }
  }

  // Normalize scores to 0-100
  const maxScore = Math.max(liveScore, reelsScore, storyScore, 1);
  const normalize = (v: number) => Math.min(100, Math.round((v / maxScore) * 100));

  // Keep only top 50 creators and top 30 tags
  const topCreators = Object.entries(creatorAffinity)
    .sort((a, b) => b[1] - a[1]).slice(0, 50)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: Math.round(v) }), {});
  const topTags = Object.entries(hashtagAffinity)
    .sort((a, b) => b[1] - a[1]).slice(0, 30)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

  await prisma.userPreferenceProfile.upsert({
    where: { userId },
    update: {
      liveScore: normalize(liveScore),
      reelsScore: normalize(reelsScore),
      storyScore: normalize(storyScore),
      premiumAffinityScore: Math.min(100, premiumAffinity),
      creatorAffinity: topCreators,
      hashtagAffinity: topTags,
    },
    create: {
      userId,
      liveScore: normalize(liveScore),
      reelsScore: normalize(reelsScore),
      storyScore: normalize(storyScore),
      premiumAffinityScore: Math.min(100, premiumAffinity),
      creatorAffinity: topCreators,
      hashtagAffinity: topTags,
    },
  });

  logger.debug(`Updated preference profile for user ${userId}`);
}

// ─── Personalized feed ranking ──────────────────────────────────

interface RankedItem {
  id: string;
  type: 'stream' | 'reel' | 'story';
  creatorId: string;
  score: number;
  bucket: string;
}

export async function getPersonalizedFeed(userId: string | null, limit = 30): Promise<{
  liveNow: any[];
  forYou: any[];
  suggestedReels: any[];
  risingCreators: any[];
}> {
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch user preferences (or defaults)
  let prefs: any = null;
  if (userId) {
    prefs = await prisma.userPreferenceProfile.findUnique({ where: { userId } });
  }
  const creatorAffinity: Record<string, number> = (prefs?.creatorAffinity as any) || {};
  const hashtagAffinity: Record<string, number> = (prefs?.hashtagAffinity as any) || {};

  // Seen content (avoid repetition)
  let seenIds = new Set<string>();
  if (userId) {
    const recent = await prisma.contentRankingSignal.findMany({
      where: { userId, createdAt: { gt: weekAgo } },
      select: { contentId: true },
      take: 200,
    });
    seenIds = new Set(recent.map(r => r.contentId));
  }

  // ── Live Now ──
  const liveStreams = await prisma.stream.findMany({
    where: { status: 'LIVE' },
    include: { creator: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } },
    orderBy: { viewerCount: 'desc' },
    take: 10,
  });

  // ── Recent Reels ──
  const reels = await prisma.reel.findMany({
    where: { createdAt: { gt: weekAgo } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Score reels
  const scoredReels = reels.map(reel => {
    const ageHours = (now.getTime() - reel.createdAt.getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, 100 - ageHours * 1.5);
    const engagement = reel.viewsCount * 1 + reel.likesCount * 3 + reel.commentsCount * 4 + reel.sharesCount * 5;
    const affinity = creatorAffinity[reel.creatorId] || 0;
    const tagMatch = reel.hashtags.reduce((sum, tag) => sum + (hashtagAffinity[tag] || 0), 0) * 5;
    const newCreator = reel.viewsCount < 50 ? 30 : 0;
    const seenPenalty = seenIds.has(reel.id) ? -100 : 0;

    return {
      reel,
      score: engagement + recency + affinity * 2 + tagMatch + newCreator + seenPenalty,
    };
  });

  scoredReels.sort((a, b) => b.score - a.score);
  const topReels = scoredReels.slice(0, limit);

  // Enrich reels with creators
  const reelCreatorIds = [...new Set(topReels.map(r => r.reel.creatorId))];
  const reelCreators = await prisma.creatorProfile.findMany({
    where: { id: { in: reelCreatorIds } },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });
  const creatorMap = new Map(reelCreators.map(c => [c.id, c]));

  const enrichedReels = topReels.map(r => ({
    ...r.reel,
    creator: creatorMap.get(r.reel.creatorId)?.user || null,
    _score: r.score,
  }));

  // ── Rising Creators ──
  const risingCreators = await prisma.creatorProfile.findMany({
    where: {
      createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    take: 10,
    orderBy: { totalEarnings: 'desc' },
  });

  return {
    liveNow: liveStreams,
    forYou: enrichedReels.slice(0, 15),
    suggestedReels: enrichedReels.slice(15, 30),
    risingCreators: risingCreators.map(c => ({ ...c.user, category: c.category })),
  };
}
