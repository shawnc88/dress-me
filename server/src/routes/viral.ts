import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

export const viralRouter = Router();

// Generate short referral code
function generateCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

// POST /api/viral/referral — Generate a referral link
viralRouter.post('/referral', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { streamId } = z.object({ streamId: z.string().optional() }).parse(req.body);

    const code = generateCode();
    const referral = await prisma.referral.create({
      data: {
        referrerId: req.user!.userId,
        code,
        streamId: streamId || null,
      },
    });

    res.json({
      code: referral.code,
      link: `${process.env.CLIENT_URL || 'https://client-gold-two-81.vercel.app'}/invite/${referral.code}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/viral/referral/:code — Track a referral click
viralRouter.get('/referral/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { code: req.params.code },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Increment click count
    await prisma.referral.update({
      where: { id: referral.id },
      data: { clicks: { increment: 1 } },
    });

    // Track event
    await prisma.feedEvent.create({
      data: {
        userId: referral.referrerId,
        creatorId: referral.referrerId,
        event: 'share_click',
        meta: { code: referral.code, streamId: referral.streamId },
      },
    }).catch(() => {}); // Non-critical

    res.json({
      referrerId: referral.referrerId,
      streamId: referral.streamId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/viral/referral/:code/claim — Claim a referral (new user joined)
viralRouter.post('/referral/:code/claim', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { code: req.params.code },
    });

    if (!referral) return res.status(404).json({ error: 'Referral not found' });
    if (referral.referredId) return res.json({ already_claimed: true });
    if (referral.referrerId === req.user!.userId) return res.status(400).json({ error: 'Cannot claim own referral' });

    // Reward: 50 free threads to referrer, 25 to new user
    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referral.id },
        data: { referredId: req.user!.userId, rewardGiven: true },
      }),
      prisma.user.update({
        where: { id: referral.referrerId },
        data: { threadBalance: { increment: 50 } },
      }),
      prisma.user.update({
        where: { id: req.user!.userId },
        data: { threadBalance: { increment: 25 } },
      }),
    ]);

    // Track events
    await Promise.all([
      prisma.feedEvent.create({
        data: { userId: referral.referrerId, creatorId: referral.referrerId, event: 'invite_sent' },
      }),
      prisma.feedEvent.create({
        data: { userId: req.user!.userId, creatorId: referral.referrerId, event: 'stream_join', meta: { via: 'referral' } },
      }),
    ]).catch(() => {});

    res.json({ rewarded: true, referrerBonus: 50, newUserBonus: 25 });
  } catch (err) {
    next(err);
  }
});

// GET /api/viral/stats — Get user's referral stats
viralRouter.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user!.userId },
      select: { code: true, clicks: true, referredId: true, rewardGiven: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalClicks = referrals.reduce((sum, r) => sum + r.clicks, 0);
    const totalJoins = referrals.filter(r => r.referredId).length;
    const totalRewards = referrals.filter(r => r.rewardGiven).length * 50;

    res.json({
      referrals,
      summary: { totalClicks, totalJoins, totalRewards },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/viral/leaderboard — Gift leaderboard for a stream
viralRouter.get('/leaderboard/:streamId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gifts = await prisma.gift.groupBy({
      by: ['senderId'],
      where: { streamId: req.params.streamId },
      _sum: { threads: true },
      _count: true,
      orderBy: { _sum: { threads: 'desc' } },
      take: 10,
    });

    // Get user details
    const userIds = gifts.map(g => g.senderId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const leaderboard = gifts.map((g, i) => ({
      rank: i + 1,
      user: userMap.get(g.senderId) || { username: 'unknown', displayName: 'Unknown' },
      totalThreads: g._sum.threads || 0,
      giftCount: g._count,
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});
