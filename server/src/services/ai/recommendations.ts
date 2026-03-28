import { prisma } from '../../utils/prisma';

export async function getRecommendedStreams(userId: string, limit = 10) {
  // Get user's subscription tier for content gating
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  const tierOrder = { BASIC: 1, PREMIUM: 2, ELITE: 3 };
  const userTier = user?.subscription?.tier || 'BASIC';
  const accessLevel = tierOrder[userTier] || 1;

  // Allowed stream types based on tier
  const allowedTypes = ['PUBLIC'];
  if (accessLevel >= 1) allowedTypes.push('PREMIUM');
  if (accessLevel >= 3) allowedTypes.push('ELITE');

  // Fetch live streams first (highest priority), then scheduled, then recent archived
  const [liveStreams, scheduledStreams, recentArchived] = await Promise.all([
    prisma.stream.findMany({
      where: { status: 'LIVE', streamType: { in: allowedTypes as any } },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { viewerCount: 'desc' },
      take: limit,
    }),
    prisma.stream.findMany({
      where: {
        status: 'SCHEDULED',
        streamType: { in: allowedTypes as any },
        scheduledFor: { gte: new Date() },
      },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 5,
    }),
    prisma.stream.findMany({
      where: {
        status: 'ARCHIVED',
        streamType: { in: allowedTypes as any },
        replayUrl: { not: null },
      },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { peakViewers: 'desc' },
      take: 5,
    }),
  ]);

  // Combine and deduplicate, prioritizing live > scheduled > archived
  const seen = new Set<string>();
  const result = [];

  for (const stream of [...liveStreams, ...scheduledStreams, ...recentArchived]) {
    if (!seen.has(stream.id) && result.length < limit) {
      seen.add(stream.id);
      result.push(stream);
    }
  }

  return result;
}

export async function getTrendingCreators(limit = 10) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const creators = await prisma.creatorProfile.findMany({
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      streams: {
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { peakViewers: true, viewerCount: true },
      },
      _count: { select: { streams: true } },
    },
  });

  // Score creators: recent stream count * 3 + total peak viewers + gift revenue proxy
  const scored = creators.map((c) => {
    const recentStreamCount = c.streams.length;
    const totalPeakViewers = c.streams.reduce((sum, s) => sum + s.peakViewers, 0);
    const score = recentStreamCount * 3 + totalPeakViewers + c.totalEarnings / 100;

    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ score, streams, _count, ...rest }) => ({
    ...rest,
    recentStreams: streams.length,
    totalStreams: _count.streams,
  }));
}
