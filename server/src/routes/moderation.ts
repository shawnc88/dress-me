import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const moderationRouter = Router();

// POST /api/moderation/report — Report a user or stream
moderationRouter.post('/report', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      targetUserId: z.string().optional(),
      targetStreamId: z.string().optional(),
      reason: z.enum(['harassment', 'explicit', 'illegal', 'spam', 'other']),
      details: z.string().max(1000).optional(),
    }).parse(req.body);

    if (!data.targetUserId && !data.targetStreamId) {
      return res.status(400).json({ error: 'Must specify targetUserId or targetStreamId' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.userId,
        targetUserId: data.targetUserId || null,
        targetStreamId: data.targetStreamId || null,
        reason: data.reason,
        details: data.details || null,
      },
    });

    res.status(201).json({ report: { id: report.id, status: report.status } });
  } catch (err) {
    next(err);
  }
});

// POST /api/moderation/block — Block a user
moderationRouter.post('/block', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);

    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: req.user!.userId,
          blockedId: userId,
        },
      },
    });

    if (existing) {
      // Unblock
      await prisma.userBlock.delete({ where: { id: existing.id } });
      return res.json({ blocked: false });
    }

    await prisma.userBlock.create({
      data: {
        blockerId: req.user!.userId,
        blockedId: userId,
      },
    });

    res.json({ blocked: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/moderation/blocked — List blocked users
moderationRouter.get('/blocked', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.user!.userId },
      select: { blockedId: true, createdAt: true },
    });
    res.json({ blocked: blocks });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/moderation/account — Delete own account (App Store requirement)
moderationRouter.delete('/account', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Delete all user data in transaction
    await prisma.$transaction([
      prisma.postComment.deleteMany({ where: { userId } }),
      prisma.postLike.deleteMany({ where: { userId } }),
      prisma.post.deleteMany({ where: { userId } }),
      prisma.giveawayEntry.deleteMany({ where: { userId } }),
      prisma.raffleEntry.deleteMany({ where: { subscriberUserId: userId } }),
      prisma.raffleWinner.deleteMany({ where: { subscriberUserId: userId } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.gift.deleteMany({ where: { senderId: userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.feedEvent.deleteMany({ where: { userId } }),
      prisma.userFollow.deleteMany({ where: { followerId: userId } }),
      prisma.userFollow.deleteMany({ where: { creatorId: userId } }),
      prisma.userBlock.deleteMany({ where: { blockerId: userId } }),
      prisma.userBlock.deleteMany({ where: { blockedId: userId } }),
      prisma.report.deleteMany({ where: { reporterId: userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      prisma.creatorProfile.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
