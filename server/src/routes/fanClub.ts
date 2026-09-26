import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { invalidateFlair } from '../services/viewerFlair';

export const fanClubRouter = Router();

// ─── Fan clubs — a creator's named supporter group ───────────────
// Join requires 3+ gifts to that creator. Members get a chat badge and a
// public member list: the mechanism behind coordinated gifting, and the
// difference between one-off gifts and a recurring group behavior.

const JOIN_GIFT_THRESHOLD = 3;

// GET /api/fan-club/:creatorId — count, member list, caller's status
fanClubRouter.get('/:creatorId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.params.creatorId;
    const [count, members] = await Promise.all([
      prisma.fanClubMember.count({ where: { creatorId } }),
      prisma.fanClubMember.findMany({
        where: { creatorId },
        orderBy: { joinedAt: 'asc' },
        take: 12,
      }),
    ]);
    const users = await prisma.user.findMany({
      where: { id: { in: members.map(m => m.userId) } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    let mine = { member: false, eligible: false, giftCount: 0 };
    if (req.user) {
      const [row, giftCount] = await Promise.all([
        prisma.fanClubMember.findUnique({
          where: { creatorId_userId: { creatorId, userId: req.user.userId } },
        }),
        prisma.gift.count({
          where: { senderId: req.user.userId, stream: { creatorId } },
        }),
      ]);
      mine = { member: !!row, eligible: giftCount >= JOIN_GIFT_THRESHOLD, giftCount };
    }

    res.json({
      count,
      members: members.map(m => userMap.get(m.userId)).filter(Boolean),
      ...mine,
      threshold: JOIN_GIFT_THRESHOLD,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/fan-club/:creatorId/join
fanClubRouter.post('/:creatorId/join', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.params.creatorId;
    const userId = req.user!.userId;

    const creator = await prisma.creatorProfile.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!creator) throw new AppError(404, 'Creator not found');

    const giftCount = await prisma.gift.count({
      where: { senderId: userId, stream: { creatorId } },
    });
    if (giftCount < JOIN_GIFT_THRESHOLD) {
      throw new AppError(400, `Send ${JOIN_GIFT_THRESHOLD - giftCount} more gift${JOIN_GIFT_THRESHOLD - giftCount === 1 ? '' : 's'} to unlock the fan club`);
    }

    await prisma.fanClubMember.upsert({
      where: { creatorId_userId: { creatorId, userId } },
      update: {},
      create: { creatorId, userId },
    });
    invalidateFlair(userId);

    const count = await prisma.fanClubMember.count({ where: { creatorId } });
    res.status(201).json({ ok: true, count });
  } catch (err) {
    next(err);
  }
});
