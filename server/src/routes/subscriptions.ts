import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';

export const subscriptionRouter = Router();

const TIER_PRICES = {
  BASIC: { monthly: 999, yearly: 9990 },     // $9.99/mo or $99.90/yr
  PREMIUM: { monthly: 2499, yearly: 24990 },  // $24.99/mo
  ELITE: { monthly: 4999, yearly: 49990 },    // $49.99/mo
} as const;

// Get current subscription
subscriptionRouter.get(
  '/current',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user!.userId },
      });
      res.json({ subscription, tiers: TIER_PRICES });
    } catch (err) {
      next(err);
    }
  }
);

// Subscribe (Stripe integration placeholder)
subscriptionRouter.post(
  '/subscribe',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tier } = z.object({ tier: z.enum(['BASIC', 'PREMIUM', 'ELITE']) }).parse(req.body);

      const existing = await prisma.subscription.findUnique({
        where: { userId: req.user!.userId },
      });
      if (existing?.status === 'ACTIVE') {
        throw new AppError(400, 'Already subscribed. Use upgrade endpoint instead.');
      }

      // TODO: Create Stripe checkout session when Stripe is configured
      if (env.NODE_ENV === 'production') {
        throw new AppError(503, 'Payment provider not configured');
      }
      // Dev mode: create subscription directly for development
      const subscription = await prisma.subscription.upsert({
        where: { userId: req.user!.userId },
        update: { tier, status: 'ACTIVE' },
        create: {
          userId: req.user!.userId,
          tier,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      res.status(201).json({ subscription });
    } catch (err) {
      next(err);
    }
  }
);

// Cancel subscription
subscriptionRouter.post(
  '/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!subscription) throw new AppError(404, 'No active subscription');

      // TODO: Cancel in Stripe when configured
      const updated = await prisma.subscription.update({
        where: { userId: req.user!.userId },
        data: { cancelAtPeriodEnd: true },
      });

      res.json({ subscription: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Get available tiers
subscriptionRouter.get('/tiers', (_req: Request, res: Response) => {
  res.json({
    tiers: [
      {
        id: 'BASIC',
        name: 'Basic',
        price: TIER_PRICES.BASIC,
        features: [
          'Access to public live streams',
          'Standard chat',
          'Limited replays',
          'Community badges',
          'Exclusive polls & early announcements',
        ],
      },
      {
        id: 'PREMIUM',
        name: 'Premium',
        price: TIER_PRICES.PREMIUM,
        features: [
          'All Basic features',
          'Premium live sessions (weekly styling classes)',
          'Private community channels',
          'Early access to merch',
          'Priority customer service',
        ],
      },
      {
        id: 'ELITE',
        name: 'Elite',
        price: TIER_PRICES.ELITE,
        features: [
          'All Premium features',
          'One-on-one outfit consultations (WebRTC)',
          'Exclusive merchandise drops',
          'Design collaboration voting rights',
          'Dynamic pricing based on demand',
        ],
      },
    ],
  });
});
