import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const threadRouter = Router();

// Thread packages available for purchase
const THREAD_PACKAGES = [
  { id: 'pack_100', threads: 100, priceUsd: 0.99 },
  { id: 'pack_500', threads: 500, priceUsd: 4.49 },
  { id: 'pack_1050', threads: 1050, priceUsd: 8.99 },    // 5% bonus
  { id: 'pack_2200', threads: 2200, priceUsd: 17.99 },   // 10% bonus
  { id: 'pack_5500', threads: 5500, priceUsd: 42.99 },   // 15% bonus
  { id: 'pack_11500', threads: 11500, priceUsd: 84.99 },  // 20% bonus
] as const;

// 210 Threads = $1 for creators (payout rate)
const CREATOR_PAYOUT_RATE = 210;

// Get thread packages
threadRouter.get('/packages', (_req: Request, res: Response) => {
  res.json({ packages: THREAD_PACKAGES, payoutRate: CREATOR_PAYOUT_RATE });
});

// Get balance
threadRouter.get('/balance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { threadBalance: true },
    });
    res.json({ balance: user?.threadBalance ?? 0 });
  } catch (err) {
    next(err);
  }
});

// Purchase threads (Stripe placeholder)
threadRouter.post('/purchase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { packageId } = z.object({ packageId: z.string() }).parse(req.body);
    const pkg = THREAD_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new AppError(400, 'Invalid package');

    // TODO: Create Stripe payment intent when configured
    // For development, credit threads directly
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { threadBalance: { increment: pkg.threads } },
      select: { threadBalance: true },
    });

    await prisma.threadPurchase.create({
      data: {
        userId: req.user!.userId,
        threads: pkg.threads,
        amountCents: Math.round(pkg.priceUsd * 100),
      },
    });

    res.json({ balance: user.threadBalance });
  } catch (err) {
    next(err);
  }
});

// Send gift (tip a creator during stream)
threadRouter.post('/gift', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      streamId: z.string(),
      giftType: z.string(),
      threads: z.number().min(1),
      message: z.string().max(200).optional(),
    }).parse(req.body);

    // Check balance
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { threadBalance: true },
    });
    if (!sender || sender.threadBalance < data.threads) {
      throw new AppError(400, 'Insufficient Threads balance');
    }

    // Get stream and creator
    const stream = await prisma.stream.findUnique({
      where: { id: data.streamId },
      include: { creator: true },
    });
    if (!stream || stream.status !== 'LIVE') {
      throw new AppError(400, 'Stream not found or not live');
    }

    // Transfer threads: deduct from sender, credit creator
    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user!.userId },
        data: { threadBalance: { decrement: data.threads } },
      }),
      prisma.creatorProfile.update({
        where: { id: stream.creatorId },
        data: { threadBalance: { increment: data.threads } },
      }),
      prisma.gift.create({
        data: {
          streamId: data.streamId,
          senderId: req.user!.userId,
          giftType: data.giftType,
          threads: data.threads,
          message: data.message,
        },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/threads/history — Transaction history
threadRouter.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '20' } = req.query;

    const [purchases, giftsGiven, giftsReceived] = await Promise.all([
      prisma.threadPurchase.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      }),
      prisma.gift.findMany({
        where: { senderId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        include: { stream: { select: { title: true } } },
      }),
      // Check if user is a creator and received gifts
      prisma.creatorProfile.findUnique({ where: { userId: req.user!.userId } }).then(async (cp) => {
        if (!cp) return [];
        return prisma.gift.findMany({
          where: { stream: { creatorId: cp.id } },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          include: {
            sender: { select: { username: true, displayName: true } },
            stream: { select: { title: true } },
          },
        });
      }),
    ]);

    res.json({ purchases, giftsGiven, giftsReceived });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/request-payout — Request creator payout
threadRouter.post('/request-payout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const payoutUsd = creator.threadBalance / CREATOR_PAYOUT_RATE;
    if (payoutUsd < 10) {
      throw new AppError(400, `Minimum payout is $10.00. Your balance is $${payoutUsd.toFixed(2)}`);
    }

    // Record payout request (Stripe Connect integration would go here)
    const threadsToDeduct = creator.threadBalance;

    await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        threadBalance: 0,
        totalEarnings: { increment: Math.round(payoutUsd * 100) },
      },
    });

    res.json({
      success: true,
      payoutUsd: payoutUsd.toFixed(2),
      threadsDeducted: threadsToDeduct,
      message: 'Payout request submitted. Funds will be processed via Stripe Connect.',
    });
  } catch (err) {
    next(err);
  }
});
