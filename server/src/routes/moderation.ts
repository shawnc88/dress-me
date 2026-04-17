import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const moderationRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

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

// DELETE /api/moderation/account — Legacy account deletion endpoint.
// Kept for older mobile builds. Delegates to the same anonymization logic
// used by DELETE /api/users/me so both paths stay consistent.
moderationRouter.delete('/account', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    if (stripe) {
      const payerSubs = await prisma.fanSubscription.findMany({
        where: { userId, provider: 'STRIPE', status: { in: ['ACTIVE', 'PAST_DUE'] }, providerSubscriptionId: { not: null } },
        select: { providerSubscriptionId: true },
      });
      for (const s of payerSubs) {
        if (!s.providerSubscriptionId) continue;
        try {
          await stripe.subscriptions.cancel(s.providerSubscriptionId);
        } catch (err: any) {
          if (err?.code !== 'resource_missing') {
            logger.error(`Stripe cancel failed for ${s.providerSubscriptionId}: ${err.message}`);
          }
        }
      }
    }

    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
    if (creator) {
      if (stripe) {
        const recipientSubs = await prisma.fanSubscription.findMany({
          where: { creatorId: creator.id, provider: 'STRIPE', status: { in: ['ACTIVE', 'PAST_DUE'] }, providerSubscriptionId: { not: null } },
          select: { providerSubscriptionId: true },
        });
        for (const s of recipientSubs) {
          if (!s.providerSubscriptionId) continue;
          try {
            await stripe.subscriptions.cancel(s.providerSubscriptionId);
          } catch (err: any) {
            if (err?.code !== 'resource_missing') {
              logger.error(`Stripe cancel failed for ${s.providerSubscriptionId}: ${err.message}`);
            }
          }
        }
      }
      await prisma.fanSubscription.updateMany({
        where: { creatorId: creator.id, status: { in: ['ACTIVE', 'PAST_DUE', 'INCOMPLETE'] } },
        data: { status: 'CANCELED', endsAt: new Date() },
      });
    }

    await prisma.fanSubscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'PAST_DUE', 'INCOMPLETE'] } },
      data: { status: 'CANCELED', endsAt: new Date() },
    });

    const marker = `deleted_${userId.slice(-10)}_${Date.now().toString(36)}`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `${marker}@deleted.local`,
        username: marker.slice(0, 30),
        displayName: 'Deleted user',
        bio: null,
        avatarUrl: null,
        passwordHash: 'DELETED',
        role: 'VIEWER',
        threadBalance: 0,
      },
    });

    if (creator) {
      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: { isLive: false, isOnboarded: false, category: 'deleted', socialLinks: null as any },
      });
      await prisma.stream.updateMany({
        where: { creatorId: creator.id, status: 'LIVE' },
        data: { status: 'ENDED' },
      });
    }

    logger.info(`Account anonymized (legacy route): userId=${userId}`);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
