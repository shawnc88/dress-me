import { prisma } from '../../utils/prisma';

interface ScoredCreator {
  creatorId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  category: string;
  isLive: boolean;
  isOnboarded: boolean;
  streamId: string | null;
  streamTitle: string | null;
  streamStatus: string | null;
  muxPlaybackId: string | null;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  streamType: string | null;
  score: number;
  bucket: 'live_now' | 'for_you' | 'rising' | 'premium' | 'new_faces';
}

interface FeedResult {
  liveNow: ScoredCreator[];
  forYou: ScoredCreator[];
  rising: ScoredCreator[];
  premium: ScoredCreator[];
  newFaces: ScoredCreator[];
}

export async function generateFeed(userId: string | null): Promise<FeedResult> {
  // 1. Fetch all creators with their latest stream
  const creators = await prisma.creatorProfile.findMany({
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      streams: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          title: true,
          status: true,
          muxPlaybackId: true,
          viewerCount: true,
          peakViewers: true,
          startedAt: true,
          streamType: true,
          createdAt: true,
        },
      },
    },
  });

  // 2. Fetch user-specific signals (if logged in)
  let followedCreatorIds = new Set<string>();
  let userEventCounts: Record<string, Record<string, number>> = {};
  let userCategories: Record<string, number> = {};
  let skippedCreatorIds = new Set<string>();

  if (userId) {
    // Follows
    const follows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { creatorId: true },
    });
    followedCreatorIds = new Set(follows.map((f) => f.creatorId));

    // Recent feed events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await prisma.feedEvent.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { creatorId: true, event: true, meta: true },
    });

    // Aggregate events per creator
    for (const evt of events) {
      if (!userEventCounts[evt.creatorId]) userEventCounts[evt.creatorId] = {};
      userEventCounts[evt.creatorId][evt.event] = (userEventCounts[evt.creatorId][evt.event] || 0) + 1;

      // Track category interest from metadata
      if (evt.meta && typeof evt.meta === 'object' && 'category' in (evt.meta as any)) {
        const cat = (evt.meta as any).category;
        userCategories[cat] = (userCategories[cat] || 0) + 1;
      }

      if (evt.event === 'skip') skippedCreatorIds.add(evt.creatorId);
    }
  }

  // 3. Fetch engagement stats per creator (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const engagementEvents = await prisma.feedEvent.groupBy({
    by: ['creatorId'],
    where: {
      event: { in: ['like', 'comment', 'view_3s', 'view_30s', 'stream_join'] },
      createdAt: { gte: sevenDaysAgo },
    },
    _count: true,
  });
  const engagementMap = new Map(engagementEvents.map((e) => [e.creatorId, e._count]));

  // 4. Score each creator
  const scored: ScoredCreator[] = creators.map((creator) => {
    const latestStream = creator.streams[0] || null;
    const isLive = creator.isLive || latestStream?.status === 'LIVE';
    const creatorProfileId = creator.id;

    // ─── Scoring components ───
    const liveBoost = isLive ? 100 : 0;

    // Watch history match (how much the user interacted with this creator)
    const events = userEventCounts[creatorProfileId] || {};
    const watchHistoryMatch = Math.min(
      ((events['view_3s'] || 0) * 1 +
        (events['view_30s'] || 0) * 3 +
        (events['stream_join'] || 0) * 5 +
        (events['like'] || 0) * 2 +
        (events['comment'] || 0) * 3 +
        (events['profile_open'] || 0) * 2) /
        10,
      25,
    );

    // Followed creator boost
    const followedBoost = followedCreatorIds.has(creatorProfileId) ? 20 : 0;

    // Category interest match
    const totalCategoryInterest = Object.values(userCategories).reduce((a, b) => a + b, 0) || 1;
    const categoryMatch = (userCategories[creator.category] || 0) / totalCategoryInterest;
    const interestBoost = categoryMatch * 15;

    // Engagement rate (how interactive this creator's content is)
    const engagementCount = engagementMap.get(creatorProfileId) || 0;
    const engagementRate = Math.min(engagementCount / 10, 15);

    // Viewer retention proxy (peak viewers as proxy for retention)
    const retentionScore = latestStream
      ? Math.min(latestStream.peakViewers / 10, 10)
      : 0;

    // New creator boost (created in last 14 days)
    const isNew = creator.createdAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const newCreatorBoost = isNew ? 5 : 0;

    // Recency boost (streamed in last 24h)
    const lastStreamRecent = latestStream?.createdAt
      && new Date(latestStream.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recencyBoost = lastStreamRecent ? 10 : 0;

    // Skip penalty
    const skipPenalty = skippedCreatorIds.has(creatorProfileId) ? -10 : 0;

    // Premium tier affinity
    const tierBoost = latestStream?.streamType === 'PREMIUM' || latestStream?.streamType === 'ELITE'
      ? ((events['tier_click'] || 0) + (events['tier_subscribe'] || 0) * 5) * 2
      : 0;

    // ─── Final score ───
    const score =
      liveBoost +
      watchHistoryMatch +
      followedBoost +
      interestBoost +
      engagementRate +
      retentionScore +
      newCreatorBoost +
      recencyBoost +
      skipPenalty +
      Math.min(tierBoost, 10);

    // ─── Determine bucket ───
    let bucket: ScoredCreator['bucket'] = 'for_you';
    if (isLive) bucket = 'live_now';
    else if (isNew && !followedCreatorIds.has(creatorProfileId)) bucket = 'new_faces';
    else if (latestStream?.streamType === 'PREMIUM' || latestStream?.streamType === 'ELITE') bucket = 'premium';
    else if (engagementCount > 20 && isNew) bucket = 'rising';

    return {
      creatorId: creator.id,
      userId: creator.user.id,
      username: creator.user.username,
      displayName: creator.user.displayName,
      avatarUrl: creator.user.avatarUrl,
      category: creator.category,
      isLive,
      isOnboarded: creator.isOnboarded,
      streamId: latestStream?.id || null,
      streamTitle: latestStream?.title || null,
      streamStatus: latestStream?.status || null,
      muxPlaybackId: latestStream?.muxPlaybackId || null,
      viewerCount: latestStream?.viewerCount || 0,
      peakViewers: latestStream?.peakViewers || 0,
      startedAt: latestStream?.startedAt?.toISOString() || null,
      streamType: latestStream?.streamType || null,
      score,
      bucket,
    };
  });

  // 5. Sort by score within buckets and apply anti-stale rules
  scored.sort((a, b) => b.score - a.score);

  // Anti-stale: no same creator more than twice in top 20
  const seen = new Map<string, number>();
  const deduped = scored.filter((c) => {
    const count = seen.get(c.creatorId) || 0;
    if (count >= 2) return false;
    seen.set(c.creatorId, count + 1);
    return true;
  });

  // 6. Split into buckets
  const result: FeedResult = {
    liveNow: deduped.filter((c) => c.bucket === 'live_now'),
    forYou: deduped.filter((c) => c.bucket === 'for_you').slice(0, 20),
    rising: deduped.filter((c) => c.bucket === 'rising').slice(0, 10),
    premium: deduped.filter((c) => c.bucket === 'premium').slice(0, 10),
    newFaces: deduped.filter((c) => c.bucket === 'new_faces').slice(0, 10),
  };

  return result;
}
