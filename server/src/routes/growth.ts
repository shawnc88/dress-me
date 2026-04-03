import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const growthRouter = Router();

// ─── STREAK SYSTEM ──────────────────────────────────────────────

const STREAK_REWARDS: Record<number, number> = {
  1: 5,    // 5 coins for day 1
  3: 15,   // 15 coins for 3-day streak
  7: 50,   // 50 coins for 7-day streak
  14: 100, // 100 coins for 2 weeks
  30: 250, // 250 coins for a month
};

// POST /api/growth/streak-checkin — Daily check-in
growthRouter.post('/streak-checkin', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const today = new Date().toISOString().slice(0, 10);

    let streak = await prisma.userStreak.findUnique({ where: { userId } });

    if (!streak) {
      // First ever check-in
      streak = await prisma.userStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, totalCoinsEarned: 5 },
      });
      await prisma.user.update({ where: { id: userId }, data: { threadBalance: { increment: 5 } } });
      return res.json({ streak, reward: 5, badge: null, isNewStreak: true });
    }

    // Already checked in today
    if (streak.lastActiveDate === today) {
      return res.json({ streak, reward: 0, badge: null, alreadyCheckedIn: true });
    }

    // Check if yesterday — continue streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const isConsecutive = streak.lastActiveDate === yesterday;
    const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, streak.longestStreak);

    // Calculate reward
    let reward = 5; // base daily reward
    if (STREAK_REWARDS[newStreak]) {
      reward = STREAK_REWARDS[newStreak]; // bonus at milestones
    }

    streak = await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        totalCoinsEarned: { increment: reward },
      },
    });

    // Award coins
    await prisma.user.update({ where: { id: userId }, data: { threadBalance: { increment: reward } } });

    // Award badge at milestones
    let badge: string | null = null;
    if (newStreak === 7) badge = 'streak_7';
    if (newStreak === 30) badge = 'streak_30';

    if (badge) {
      await prisma.userBadge.upsert({
        where: { userId_badge: { userId, badge } },
        create: { userId, badge },
        update: {},
      });
    }

    res.json({ streak, reward, badge, isNewStreak: !isConsecutive });
  } catch (err) {
    next(err);
  }
});

// GET /api/growth/streak — Get current streak
growthRouter.get('/streak', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streak = await prisma.userStreak.findUnique({ where: { userId: req.user!.userId } });
    const badges = await prisma.userBadge.findMany({ where: { userId: req.user!.userId } });
    res.json({ streak: streak || { currentStreak: 0, longestStreak: 0, totalCoinsEarned: 0 }, badges });
  } catch (err) {
    next(err);
  }
});

// ─── CREATOR BOOST SYSTEM ───────────────────────────────────────

// Called internally when a creator goes live — applies boost if eligible
export async function applyCreatorBoost(creatorId: string) {
  // Count total streams by this creator
  const streamCount = await prisma.stream.count({ where: { creatorId } });

  // New creator boost: first 3 streams get +50
  if (streamCount <= 3) {
    await prisma.creatorBoost.create({
      data: {
        creatorId,
        boostType: 'new_creator',
        boostScore: 50,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
  }

  // Check for momentum boost (viewer growth rate)
  const recentStreams = await prisma.stream.findMany({
    where: { creatorId, status: 'ENDED' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { peakViewers: true },
  });

  if (recentStreams.length >= 2) {
    const latest = recentStreams[0].peakViewers;
    const previous = recentStreams[1].peakViewers;
    if (previous > 0 && latest / previous > 1.5) {
      // 50%+ growth — momentum boost
      await prisma.creatorBoost.create({
        data: {
          creatorId,
          boostType: 'momentum',
          boostScore: 30,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        },
      });
    }
  }
}

// GET /api/growth/creator-boost/:creatorId — Get boost score
growthRouter.get('/creator-boost/:creatorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boosts = await prisma.creatorBoost.findMany({
      where: { creatorId: req.params.creatorId, expiresAt: { gt: new Date() } },
    });
    const totalBoost = boosts.reduce((sum, b) => sum + b.boostScore, 0);
    res.json({ boosts, totalBoost });
  } catch (err) {
    next(err);
  }
});

// ─── FOLLOW PROMPT LOGIC ────────────────────────────────────────

// GET /api/growth/should-prompt-follow/:streamId — Check if follow prompt should show
growthRouter.get('/should-prompt-follow/:streamId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const streamId = req.params.streamId;

    // Get stream's creator
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { creatorId: true },
    });
    if (!stream) return res.json({ shouldPrompt: false });

    // Already following?
    const existing = await prisma.userFollow.findFirst({
      where: { followerId: userId, creatorId: stream.creatorId },
    });
    if (existing) return res.json({ shouldPrompt: false });

    // Count interactions in this stream
    const interactions = await prisma.feedEvent.count({
      where: { userId, streamId, event: { in: ['like', 'comment', 'view_30s'] } },
    });

    // Prompt after 2+ interactions
    res.json({ shouldPrompt: interactions >= 2, creatorId: stream.creatorId });
  } catch (err) {
    next(err);
  }
});

// ─── DISCOVERY BUCKETS ──────────────────────────────────────────

// GET /api/growth/discovery — Rising, Trending, New Faces
growthRouter.get('/discovery', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    // Clean up expired boosts
    await prisma.creatorBoost.deleteMany({ where: { expiresAt: { lt: now } } });

    // Rising: creators with active boosts
    const boosts = await prisma.creatorBoost.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { boostScore: 'desc' },
      take: 10,
    });
    const risingCreatorIds = [...new Set(boosts.map((b) => b.creatorId))];

    const risingCreators = risingCreatorIds.length > 0
      ? await prisma.creatorProfile.findMany({
          where: { id: { in: risingCreatorIds } },
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        })
      : [];

    // Trending: creators with most followers in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingFollows = await prisma.userFollow.groupBy({
      by: ['creatorId'],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
      orderBy: { _count: { creatorId: 'desc' } },
      take: 10,
    });

    const trendingCreators = trendingFollows.length > 0
      ? await prisma.creatorProfile.findMany({
          where: { id: { in: trendingFollows.map((f) => f.creatorId) } },
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        })
      : [];

    // New Faces: creators who joined in the last 14 days
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const newCreators = await prisma.creatorProfile.findMany({
      where: { createdAt: { gte: twoWeeksAgo } },
      include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      rising: risingCreators.map((c) => ({ ...c, boostScore: boosts.find((b) => b.creatorId === c.id)?.boostScore || 0 })),
      trending: trendingCreators.map((c) => ({
        ...c,
        newFollowers: trendingFollows.find((f) => f.creatorId === c.id)?._count || 0,
      })),
      newFaces: newCreators,
    });
  } catch (err) {
    next(err);
  }
});

// ─── VIP TIER STATUS ────────────────────────────────────────────

// GET /api/growth/vip-status/:creatorId — Get viewer's VIP status for a creator
growthRouter.get('/vip-status/:creatorId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const creatorId = req.params.creatorId;

    // Calculate total gifts sent to this creator
    const giftTotal = await prisma.gift.aggregate({
      where: { senderId: userId, stream: { creatorId } },
      _sum: { threads: true },
      _count: true,
    });

    const totalThreads = giftTotal._sum.threads || 0;
    const giftCount = giftTotal._count || 0;

    // Determine VIP tier
    let tier = 'supporter';
    let tierColor = 'text-gray-400';
    if (totalThreads >= 5000) { tier = 'inner_circle'; tierColor = 'text-amber-400'; }
    else if (totalThreads >= 1000) { tier = 'elite'; tierColor = 'text-violet-400'; }
    else if (totalThreads >= 200) { tier = 'vip'; tierColor = 'text-brand-500'; }

    // Check subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, status: true },
    });

    // Get badges
    const badges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badge: true, earnedAt: true },
    });

    // Get rank among fans
    const allGifters = await prisma.gift.groupBy({
      by: ['senderId'],
      where: { stream: { creatorId } },
      _sum: { threads: true },
      orderBy: { _sum: { threads: 'desc' } },
    });
    const rank = allGifters.findIndex((g) => g.senderId === userId) + 1;

    res.json({
      tier,
      tierColor,
      totalThreads,
      giftCount,
      rank: rank > 0 ? rank : null,
      subscription: subscription?.status === 'ACTIVE' ? subscription.tier : null,
      badges: badges.map((b) => b.badge),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/growth/top-fans/:creatorId — Leaderboard
growthRouter.get('/top-fans/:creatorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.params.creatorId;

    const topGifters = await prisma.gift.groupBy({
      by: ['senderId'],
      where: { stream: { creatorId } },
      _sum: { threads: true },
      _count: true,
      orderBy: { _sum: { threads: 'desc' } },
      take: 10,
    });

    const userIds = topGifters.map((g) => g.senderId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get badges for top fans
    const badges = await prisma.userBadge.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, badge: true },
    });
    const badgeMap = new Map<string, string[]>();
    badges.forEach((b) => {
      if (!badgeMap.has(b.userId)) badgeMap.set(b.userId, []);
      badgeMap.get(b.userId)!.push(b.badge);
    });

    const leaderboard = topGifters.map((g, i) => {
      const totalThreads = g._sum.threads || 0;
      let tier = 'supporter';
      if (totalThreads >= 5000) tier = 'inner_circle';
      else if (totalThreads >= 1000) tier = 'elite';
      else if (totalThreads >= 200) tier = 'vip';

      return {
        rank: i + 1,
        user: userMap.get(g.senderId),
        totalThreads,
        giftCount: g._count,
        tier,
        badges: badgeMap.get(g.senderId) || [],
      };
    });

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});
