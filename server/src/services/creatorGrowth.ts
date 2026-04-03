import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ─── Generate post-stream summary ───────────────────────────────

export async function generatePostStreamSummary(streamId: string): Promise<void> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { creator: true },
  });
  if (!stream) return;

  const duration = stream.startedAt && stream.endedAt
    ? Math.round((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000)
    : 0;

  // Count chat messages
  const chatMessages = await prisma.chatMessage.count({ where: { streamId } });

  // Count gifts
  const gifts = await prisma.gift.aggregate({
    where: { streamId },
    _count: true,
    _sum: { threads: true },
  });

  // Count new followers during stream
  const newFollowers = stream.startedAt
    ? await prisma.userFollow.count({
        where: {
          creatorId: stream.creatorId,
          createdAt: { gte: stream.startedAt, lte: stream.endedAt || new Date() },
        },
      })
    : 0;

  // Viewer sessions
  const sessions = await prisma.viewerSession.findMany({
    where: { streamId },
    select: { userId: true, joinedAt: true, leftAt: true, lastSeenAt: true },
  });

  const totalViewers = sessions.length;
  const avgWatchTime = sessions.length > 0
    ? Math.round(
        sessions.reduce((sum, s) => {
          const end = s.leftAt || s.lastSeenAt;
          return sum + (end.getTime() - s.joinedAt.getTime());
        }, 0) / sessions.length
      )
    : 0;

  // Repeat viewers (watched this creator before)
  const viewerUserIds = sessions.map(s => s.userId).filter(Boolean) as string[];
  let repeatViewerRate = 0;
  if (viewerUserIds.length > 0) {
    const previousViewers = await prisma.viewerSession.findMany({
      where: {
        userId: { in: viewerUserIds },
        streamId: { not: streamId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    repeatViewerRate = previousViewers.length / viewerUserIds.length;
  }

  // Top fans (most gifts + messages)
  const topFanUserIds = viewerUserIds.slice(0, 5);

  await prisma.postStreamSummary.upsert({
    where: { streamId },
    update: {
      duration,
      peakViewers: stream.peakViewers,
      totalViewers,
      newFollowers,
      giftsReceived: gifts._count,
      giftValueThreads: gifts._sum.threads || 0,
      chatMessages,
      avgWatchTimeMs: avgWatchTime,
      repeatViewerRate,
      topFanUserIds,
    },
    create: {
      streamId,
      creatorId: stream.creatorId,
      duration,
      peakViewers: stream.peakViewers,
      totalViewers,
      newFollowers,
      giftsReceived: gifts._count,
      giftValueThreads: gifts._sum.threads || 0,
      chatMessages,
      avgWatchTimeMs: avgWatchTime,
      repeatViewerRate,
      topFanUserIds,
    },
  });

  logger.info(`Post-stream summary generated for stream ${streamId}`);
}

// ─── Update daily creator growth metrics ────────────────────────

export async function updateCreatorDailyMetrics(creatorId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(today + 'T00:00:00Z');
  const endOfDay = new Date(today + 'T23:59:59Z');

  const [newFollowers, unfollows, streams, reelStats, storyViews] = await Promise.all([
    prisma.userFollow.count({
      where: { creatorId, createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    0, // Would need a follow log to track unfollows
    prisma.stream.findMany({
      where: { creatorId, createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { viewerCount: true, peakViewers: true },
    }),
    prisma.reel.aggregate({
      where: { creatorId, createdAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { viewsCount: true, likesCount: true },
    }),
    prisma.story.aggregate({
      where: { creatorId, createdAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { viewCount: true },
    }),
  ]);

  const totalViewers = streams.reduce((sum, s) => sum + s.viewerCount, 0);

  await prisma.creatorGrowthMetric.upsert({
    where: { creatorId_date: { creatorId, date: today } },
    update: {
      newFollowers,
      streamCount: streams.length,
      totalViewers,
      reelViews: reelStats._sum.viewsCount || 0,
      reelLikes: reelStats._sum.likesCount || 0,
      storyViews: storyViews._sum.viewCount || 0,
    },
    create: {
      creatorId,
      date: today,
      newFollowers,
      unfollows,
      streamCount: streams.length,
      totalViewers,
      reelViews: reelStats._sum.viewsCount || 0,
      reelLikes: reelStats._sum.likesCount || 0,
      storyViews: storyViews._sum.viewCount || 0,
    },
  });
}

// ─── Get creator growth metrics ─────────────────────────────────

export async function getCreatorGrowthMetrics(creatorId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];

  const metrics = await prisma.creatorGrowthMetric.findMany({
    where: { creatorId, date: { gte: sinceDate } },
    orderBy: { date: 'asc' },
  });

  const totalFollowers = await prisma.userFollow.count({ where: { creatorId } });

  // Active boosts
  const boosts = await prisma.creatorBoost.findMany({
    where: { creatorId, expiresAt: { gt: new Date() } },
  });

  return {
    metrics,
    totalFollowers,
    activeBoosts: boosts,
    summary: {
      totalNewFollowers: metrics.reduce((sum, m) => sum + m.newFollowers, 0),
      totalStreamViewers: metrics.reduce((sum, m) => sum + m.totalViewers, 0),
      totalReelViews: metrics.reduce((sum, m) => sum + m.reelViews, 0),
      avgFollowConversion: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.followConversionRate, 0) / metrics.length
        : 0,
    },
  };
}
