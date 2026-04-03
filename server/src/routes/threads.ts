import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const threadRouter = Router();

// Initialize Stripe
const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' as any })
  : null;

// Thread packages available for purchase
const THREAD_PACKAGES = [
  { id: 'pack_100', threads: 100, priceCents: 99, label: '100 Threads' },
  { id: 'pack_500', threads: 500, priceCents: 449, label: '500 Threads' },
  { id: 'pack_1050', threads: 1050, priceCents: 899, label: '1,050 Threads (+5%)' },
  { id: 'pack_2200', threads: 2200, priceCents: 1799, label: '2,200 Threads (+10%)' },
  { id: 'pack_5500', threads: 5500, priceCents: 4299, label: '5,500 Threads (+15%)' },
  { id: 'pack_11500', threads: 11500, priceCents: 8499, label: '11,500 Threads (+20%)' },
] as const;

const CREATOR_PAYOUT_RATE = 210; // 210 threads = $1

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

// POST /api/threads/checkout — Create Stripe Checkout Session
threadRouter.post('/checkout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!stripe) throw new AppError(503, 'Stripe is not configured');

    const { packageId } = z.object({ packageId: z.string() }).parse(req.body);
    const pkg = THREAD_PACKAGES.find(p => p.id === packageId);
    if (!pkg) throw new AppError(400, 'Invalid package');

    const clientUrl = env.CLIENT_URL || 'https://dressmeapp.me';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pkg.label,
            description: `${pkg.threads} threads for Dress Me`,
          },
          unit_amount: pkg.priceCents,
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user!.userId,
        packageId: pkg.id,
        threads: String(pkg.threads),
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    logger.info(`Stripe checkout session created: ${session.id} for user ${req.user!.userId}, package ${pkg.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/purchase — Direct purchase (dev fallback if no Stripe)
threadRouter.post('/purchase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { packageId } = z.object({ packageId: z.string() }).parse(req.body);
    const pkg = THREAD_PACKAGES.find(p => p.id === packageId);
    if (!pkg) throw new AppError(400, 'Invalid package');

    // If Stripe is configured, redirect to checkout
    if (stripe) {
      throw new AppError(400, 'Use /api/threads/checkout for real payments');
    }

    // Dev mode: credit directly
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { threadBalance: { increment: pkg.threads } },
      select: { threadBalance: true },
    });

    await prisma.threadPurchase.create({
      data: {
        userId: req.user!.userId,
        threads: pkg.threads,
        amountCents: pkg.priceCents,
      },
    });

    res.json({ balance: user.threadBalance });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/webhook — Stripe webhook for payment confirmation
threadRouter.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  let event: Stripe.Event;

  if (env.STRIPE_WEBHOOK_SECRET) {
    const sig = req.headers['stripe-signature'] as string;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Webhook signature failed' });
    }
  } else {
    // No webhook secret configured — parse directly (dev mode)
    event = req.body;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const threads = Number(session.metadata?.threads);
    const packageId = session.metadata?.packageId;

    if (userId && threads > 0) {
      logger.info(`Stripe payment complete: user=${userId}, threads=${threads}, package=${packageId}`);

      await prisma.user.update({
        where: { id: userId },
        data: { threadBalance: { increment: threads } },
      });

      await prisma.threadPurchase.create({
        data: {
          userId,
          threads,
          amountCents: session.amount_total || 0,
          stripePaymentId: session.payment_intent as string,
          status: 'completed',
        },
      });

      logger.info(`Threads credited: ${threads} to user ${userId}`);
    }
  }

  res.json({ received: true });
});

// Send gift
threadRouter.post('/gift', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      streamId: z.string(),
      giftType: z.string(),
      threads: z.number().min(1),
      message: z.string().max(200).optional(),
    }).parse(req.body);

    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { threadBalance: true },
    });
    if (!sender || sender.threadBalance < data.threads) {
      throw new AppError(400, 'Insufficient Threads balance');
    }

    const stream = await prisma.stream.findUnique({
      where: { id: data.streamId },
      include: { creator: true },
    });
    if (!stream || stream.status !== 'LIVE') {
      throw new AppError(400, 'Stream not found or not live');
    }

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

// GET /api/threads/history
threadRouter.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '20' } = req.query;

    const [purchases, giftsGiven] = await Promise.all([
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
    ]);

    res.json({ purchases, giftsGiven });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/request-payout
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
    });
  } catch (err) {
    next(err);
  }
});
