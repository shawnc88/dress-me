import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import multer from 'multer';

export const userRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only JPEG, PNG, and WebP images are allowed') as any);
    }
  },
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().max(5000000).optional().nullable(), // Allow base64 data URLs
});

// POST /api/users/avatar — Upload profile picture
userRouter.post(
  '/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'Image is required');
      }

      const base64 = req.file.buffer.toString('base64');
      const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { avatarUrl },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          role: true,
          threadBalance: true,
          createdAt: true,
          email: true,
        },
      });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

userRouter.get('/profile/:username', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        creatorProfile: {
          select: { id: true, category: true, isLive: true, totalEarnings: true },
        },
      },
    });
    if (!user) throw new AppError(404, 'User not found');

    const isCreator = user.role === 'CREATOR' || user.role === 'ADMIN';
    const creatorId = user.creatorProfile?.id;

    // Fetch counts in parallel
    const [followerCount, reels, posts, liveStream, totalLikes] = await Promise.all([
      creatorId
        ? prisma.userFollow.count({ where: { creatorId } })
        : 0,
      creatorId
        ? prisma.reel.findMany({
            where: { creatorId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: { id: true, muxPlaybackId: true, thumbnailUrl: true, viewsCount: true, likesCount: true, caption: true },
          })
        : [],
      prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, imageUrl: true, caption: true },
      }),
      creatorId
        ? prisma.stream.findFirst({
            where: { creatorId, status: 'LIVE' },
            select: { id: true, title: true, viewerCount: true },
          })
        : null,
      creatorId
        ? prisma.reel.aggregate({ where: { creatorId }, _sum: { likesCount: true } })
        : { _sum: { likesCount: 0 } },
    ]);

    res.json({
      user: {
        ...user,
        isCreator,
        followerCount,
        totalLikes: totalLikes._sum.likesCount || 0,
        reelCount: (reels as any[]).length,
        earnings: isCreator && req.user?.userId === user.id ? (user.creatorProfile?.totalEarnings || 0) / 100 : undefined,
      },
      reels,
      posts,
      liveStream,
    });
  } catch (err) {
    next(err);
  }
});

userRouter.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatarUrl } = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName, bio, avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        threadBalance: true,
        createdAt: true,
        email: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

userRouter.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatarUrl } = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName, bio, avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me — Delete account (App Store Guideline 5.1.1(v))
// Uses anonymization rather than hard-delete so non-cascading FK relations
// (gifts sent, DMs sent) stay referentially valid for other users.
userRouter.delete('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { confirm } = z.object({ confirm: z.literal('DELETE') }).parse(req.body);
    void confirm;

    const userId = req.user!.userId;

    // 1. Cancel Stripe subs where this user is the PAYER (fan)
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

    // 2. If user is a creator, cancel subs where they are the RECIPIENT
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

    // 3. Cancel user's own fan subs (as payer) in the DB
    await prisma.fanSubscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'PAST_DUE', 'INCOMPLETE'] } },
      data: { status: 'CANCELED', endsAt: new Date() },
    });

    // 4. Anonymize PII. Use cuid-like deleted markers so unique constraints still hold.
    const marker = `deleted_${userId.slice(-10)}_${Date.now().toString(36)}`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `${marker}@deleted.local`,
        username: marker.slice(0, 30),
        displayName: 'Deleted user',
        bio: null,
        avatarUrl: null,
        passwordHash: 'DELETED', // not a valid bcrypt hash — login will always fail
        role: 'VIEWER',
        threadBalance: 0,
      },
    });

    // 5. Tear down creator artifacts that must stop being discoverable
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

    logger.info(`Account anonymized: userId=${userId}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
