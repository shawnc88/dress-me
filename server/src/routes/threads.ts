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

// Thread package config — must stay in sync with client + Apple IAP product IDs
interface CoinPackage {
  id: string;
  productId: string;         // Apple IAP product ID
  coins: number;             // total coins credited (base + bonus)
  priceLabel: string;
  usdAmount: number;         // cents
  badge?: 'most_popular' | 'best_value' | 'vip_pack';
  bonusLabel?: string;
  active: boolean;
}

const THREAD_PACKAGES: CoinPackage[] = [
  { id: 'pack_500',   productId: 'threads_500',   coins: 500,  priceLabel: '$4.99',  usdAmount: 499,  active: true },
  { id: 'pack_1050',  productId: 'threads_1050',  coins: 1200, priceLabel: '$9.99',  usdAmount: 999,  badge: 'most_popular', bonusLabel: '20% extra', active: true },
  { id: 'pack_5500',  productId: 'threads_5500',  coins: 3500, priceLabel: '$24.99', usdAmount: 2499, badge: 'best_value',   bonusLabel: '40% extra', active: true },
  { id: 'pack_11500', productId: 'threads_11500', coins: 8000, priceLabel: '$49.99', usdAmount: 4999, badge: 'vip_pack',     bonusLabel: '60% extra', active: true },
];

// Legacy alias for backward compatibility with checkout endpoint
const LEGACY_PACKAGE_MAP: Record<string, CoinPackage> = {};
THREAD_PACKAGES.forEach(p => { LEGACY_PACKAGE_MAP[p.id] = p; });

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
    const { packageId } = z.object({ packageId: z.string() }).parse(req.body);
    const pkg = THREAD_PACKAGES.find(p => p.id === packageId);
    if (!pkg) throw new AppError(400, 'Invalid package');

    if (!stripe) {
      // Dev mode: credit threads directly if Stripe not configured
      logger.info(`Stripe not configured — dev mode credit: ${pkg.coins} threads to user ${req.user!.userId}`);
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { threadBalance: { increment: pkg.coins } },
        select: { threadBalance: true },
      });

      await prisma.threadPurchase.create({
        data: {
          userId: req.user!.userId,
          threads: pkg.coins,
          amountCents: pkg.usdAmount,
        },
      });

      return res.json({ devMode: true, balance: user.threadBalance, threads: pkg.coins });
    }

    const clientUrl = env.CLIENT_URL || 'https://bewithmeapp.me';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pkg.priceLabel,
            description: `${pkg.coins} threads for Be With Me`,
          },
          unit_amount: pkg.usdAmount,
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user!.userId,
        packageId: pkg.id,
        threads: String(pkg.coins),
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    logger.info(`Stripe checkout session created: ${session.id} for user ${req.user!.userId}, package ${pkg.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    // Log the actual error for debugging
    logger.error(`Thread checkout error: ${err.message}`, { type: err.type, code: err.code, statusCode: err.statusCode });
    if (err instanceof AppError) return next(err);
    // Wrap Stripe/unknown errors with meaningful message
    next(new AppError(err.statusCode || 500, err.message || 'Checkout failed'));
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
      data: { threadBalance: { increment: pkg.coins } },
      select: { threadBalance: true },
    });

    await prisma.threadPurchase.create({
      data: {
        userId: req.user!.userId,
        threads: pkg.coins,
        amountCents: pkg.usdAmount,
      },
    });

    res.json({ balance: user.threadBalance });
  } catch (err) {
    next(err);
  }
});

// Apple IAP consumable product → coin map (must match THREAD_PACKAGES.coins)
const APPLE_THREAD_PRODUCTS: Record<string, number> = {
  threads_500: 500,
  threads_1050: 1200,
  threads_5500: 3500,
  threads_11500: 8000,
};

// POST /api/threads/apple-iap — Credit threads from Apple IAP consumable purchase
threadRouter.post('/apple-iap', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId, originalTransactionId, productId, threads } = z.object({
      transactionId: z.string(),
      originalTransactionId: z.string(),
      productId: z.string(),
      threads: z.number().min(1),
    }).parse(req.body);

    // Validate product ID maps to correct thread count
    const expectedThreads = APPLE_THREAD_PRODUCTS[productId];
    if (!expectedThreads || expectedThreads !== threads) {
      throw new AppError(400, `Invalid product or thread count: ${productId}`);
    }

    // Idempotency: check if this transaction was already credited
    const existingPurchase = await prisma.threadPurchase.findFirst({
      where: { stripePaymentId: `apple_${transactionId}` },
    });
    if (existingPurchase) {
      // Already credited — return current balance
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { threadBalance: true },
      });
      return res.json({ balance: user?.threadBalance || 0, duplicate: true });
    }

    // Credit threads atomically
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { threadBalance: { increment: threads } },
      select: { threadBalance: true },
    });

    await prisma.threadPurchase.create({
      data: {
        userId: req.user!.userId,
        threads,
        amountCents: 0, // Apple handles pricing; we don't know exact amount after Apple's cut
        stripePaymentId: `apple_${transactionId}`, // reuse field for idempotency
        status: 'completed',
      },
    });

    logger.info(`Apple IAP thread purchase: user=${req.user!.userId}, product=${productId}, threads=${threads}, txId=${transactionId}`);
    res.json({ balance: user.threadBalance, threads });
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
  } else if (env.NODE_ENV === 'production') {
    logger.error('STRIPE_WEBHOOK_SECRET not configured in production — rejecting webhook');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  } else {
    // Dev mode — parse directly
    event = req.body;
  }

  // Idempotency check — skip if already processed
  const eventId = event.id;
  if (eventId) {
    const existing = await prisma.webhookEventLog.findUnique({ where: { id: eventId } });
    if (existing) {
      logger.info(`Thread webhook event ${eventId} already processed, skipping`);
      return res.json({ received: true, duplicate: true });
    }
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

  // Record processed event for idempotency
  if (eventId) {
    await prisma.webhookEventLog.create({
      data: { id: eventId, provider: 'stripe', eventType: event.type },
    }).catch(() => {}); // Ignore if already exists (race)
  }

  res.json({ received: true });
});

// Send gift — emits directly to chat after DB transaction (no client socket needed)
threadRouter.post('/gift', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      streamId: z.string(),
      giftType: z.string(),
      threads: z.number().min(1),
      message: z.string().max(200).optional(),
    }).parse(req.body);

    const stream = await prisma.stream.findUnique({
      where: { id: data.streamId },
      include: { creator: true },
    });
    if (!stream || stream.status !== 'LIVE') {
      throw new AppError(400, 'Stream not found or not live');
    }

    // Atomic balance check + deduction inside Serializable transaction
    // Prevents race condition where concurrent gifts overdraft balance
    const sender = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.user!.userId },
        select: { threadBalance: true, displayName: true, username: true, avatarUrl: true },
      });
      if (!user || user.threadBalance < data.threads) {
        throw new AppError(400, 'Insufficient Threads balance');
      }

      await tx.user.update({
        where: { id: req.user!.userId },
        data: { threadBalance: { decrement: data.threads } },
      });

      await tx.creatorProfile.update({
        where: { id: stream.creatorId },
        data: { threadBalance: { increment: data.threads } },
      });

      await tx.gift.create({
        data: {
          streamId: data.streamId,
          senderId: req.user!.userId,
          giftType: data.giftType,
          threads: data.threads,
          message: data.message,
        },
      });

      return user;
    }, { isolationLevel: 'Serializable' });

    // Persist gift message in chat history
    const chatMsg = await prisma.chatMessage.create({
      data: {
        streamId: data.streamId,
        userId: req.user!.userId,
        type: 'GIFT',
        content: `${sender.displayName} sent ${data.giftType} (${data.threads} threads)${data.message ? `: ${data.message}` : ''}`,
      },
    });

    // Emit gift message to chat directly from the server
    // This is the source of truth — only fires after payment succeeds
    const { io } = await import('../index');
    io.to(`stream:${data.streamId}`).emit('gift-received', {
      id: chatMsg.id,
      type: 'gift',
      sender: sender.displayName,
      senderUsername: sender.username,
      senderAvatar: sender.avatarUrl,
      giftType: data.giftType,
      threads: data.threads,
      message: data.message,
    });

    logger.info(`Gift sent: ${req.user!.userId} → stream ${data.streamId}, ${data.giftType} (${data.threads} threads)`);
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
