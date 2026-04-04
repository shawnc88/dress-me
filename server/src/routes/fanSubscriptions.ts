import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const fanSubscriptionRouter = Router();

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' as any })
  : null;

// Platform fee percentage on creator subscriptions
const PLATFORM_FEE_PERCENT = 20;

// ─── GET /api/fan-subscriptions/me — My active fan subscriptions ──

fanSubscriptionRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subs = await prisma.fanSubscription.findMany({
        where: { userId: req.user!.userId, status: 'ACTIVE' },
        include: {
          tier: {
            select: { name: true, priceCents: true, benefits: true, creatorId: true },
          },
        },
      });

      // Enrich with creator info
      const creatorIds = [...new Set(subs.map(s => s.creatorId))];
      const creators = await prisma.creatorProfile.findMany({
        where: { id: { in: creatorIds } },
        include: { user: { select: { displayName: true, username: true, avatarUrl: true } } },
      });
      const creatorMap = Object.fromEntries(creators.map(c => [c.id, c]));

      res.json({
        subscriptions: subs.map(s => ({
          ...s,
          creator: creatorMap[s.creatorId],
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/fan-subscriptions/check/:creatorId — Check subscription to a creator ──

fanSubscriptionRouter.get(
  '/check/:creatorId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await prisma.fanSubscription.findUnique({
        where: {
          userId_creatorId: {
            userId: req.user!.userId,
            creatorId: req.params.creatorId,
          },
        },
        include: { tier: true },
      });

      res.json({
        subscribed: sub?.status === 'ACTIVE',
        subscription: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/fan-subscriptions/checkout — Stripe subscription checkout ──

fanSubscriptionRouter.post(
  '/checkout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tierId } = z.object({ tierId: z.string() }).parse(req.body);

      const tier = await prisma.creatorTier.findUnique({ where: { id: tierId } });
      if (!tier || !tier.active) throw new AppError(404, 'Tier not found or inactive');

      // Check slot limit for Inner Circle
      if (tier.slotLimit) {
        const activeCount = await prisma.fanSubscription.count({
          where: { tierId: tier.id, status: 'ACTIVE' },
        });
        if (activeCount >= tier.slotLimit) {
          throw new AppError(400, 'This tier is full. No spots available.');
        }
      }

      // Check if already subscribed to this creator
      const existing = await prisma.fanSubscription.findUnique({
        where: {
          userId_creatorId: {
            userId: req.user!.userId,
            creatorId: tier.creatorId,
          },
        },
      });

      if (existing?.status === 'ACTIVE') {
        throw new AppError(400, 'Already subscribed to this creator. Use upgrade endpoint.');
      }

      if (!stripe) {
        // Dev mode: create subscription directly
        const sub = await prisma.fanSubscription.upsert({
          where: {
            userId_creatorId: {
              userId: req.user!.userId,
              creatorId: tier.creatorId,
            },
          },
          update: {
            tierId: tier.id,
            status: 'ACTIVE',
            provider: 'STRIPE',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
            endsAt: null,
          },
          create: {
            userId: req.user!.userId,
            creatorId: tier.creatorId,
            tierId: tier.id,
            status: 'ACTIVE',
            provider: 'STRIPE',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        logger.info(`Dev mode: Fan subscription created for user ${req.user!.userId} to creator ${tier.creatorId}`);
        return res.status(201).json({ subscription: sub, devMode: true });
      }

      // Get or create Stripe customer
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) throw new AppError(404, 'User not found');

      // Get creator info for product description
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: tier.creatorId },
        include: { user: { select: { displayName: true, username: true } } },
      });

      // Create a Stripe Price on-the-fly (or use cached stripePriceId)
      let priceId = tier.stripePriceId;
      if (!priceId) {
        const product = await stripe.products.create({
          name: `${creator?.user.displayName || 'Creator'} — ${tier.name} Tier`,
          metadata: { creatorId: tier.creatorId, tierName: tier.name },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: tier.priceCents,
          currency: 'usd',
          recurring: { interval: 'month' },
        });

        priceId = price.id;
        await prisma.creatorTier.update({
          where: { id: tier.id },
          data: { stripePriceId: priceId },
        });
      }

      const clientUrl = env.CLIENT_URL || 'https://dressmeapp.me';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          userId: req.user!.userId,
          creatorId: tier.creatorId,
          tierId: tier.id,
          tierName: tier.name,
          type: 'fan_subscription',
        },
        subscription_data: {
          metadata: {
            userId: req.user!.userId,
            creatorId: tier.creatorId,
            tierId: tier.id,
            type: 'fan_subscription',
          },
        },
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
        cancel_url: `${clientUrl}/payment/cancel`,
      });

      logger.info(`Fan subscription checkout created: ${session.id} for tier ${tier.name}`);
      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/fan-subscriptions/upgrade — Upgrade/downgrade tier ──

fanSubscriptionRouter.post(
  '/upgrade',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, newTierId } = z.object({
        creatorId: z.string(),
        newTierId: z.string(),
      }).parse(req.body);

      const existing = await prisma.fanSubscription.findUnique({
        where: { userId_creatorId: { userId: req.user!.userId, creatorId } },
        include: { tier: true },
      });
      if (!existing || existing.status !== 'ACTIVE') {
        throw new AppError(400, 'No active subscription to upgrade');
      }

      const newTier = await prisma.creatorTier.findUnique({ where: { id: newTierId } });
      if (!newTier || !newTier.active || newTier.creatorId !== creatorId) {
        throw new AppError(404, 'Target tier not found');
      }

      // Check slot limit
      if (newTier.slotLimit) {
        const activeCount = await prisma.fanSubscription.count({
          where: { tierId: newTier.id, status: 'ACTIVE' },
        });
        if (activeCount >= newTier.slotLimit) {
          throw new AppError(400, 'Target tier is full');
        }
      }

      if (stripe && existing.providerSubscriptionId) {
        // Update Stripe subscription
        const stripeSub = await stripe.subscriptions.retrieve(existing.providerSubscriptionId);
        let priceId = newTier.stripePriceId;

        if (!priceId) {
          const creator = await prisma.creatorProfile.findUnique({
            where: { id: creatorId },
            include: { user: { select: { displayName: true } } },
          });
          const product = await stripe.products.create({
            name: `${creator?.user.displayName || 'Creator'} — ${newTier.name} Tier`,
            metadata: { creatorId, tierName: newTier.name },
          });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: newTier.priceCents,
            currency: 'usd',
            recurring: { interval: 'month' },
          });
          priceId = price.id;
          await prisma.creatorTier.update({
            where: { id: newTier.id },
            data: { stripePriceId: priceId },
          });
        }

        await stripe.subscriptions.update(existing.providerSubscriptionId, {
          items: [{
            id: stripeSub.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
          metadata: { tierId: newTier.id, tierName: newTier.name },
        });
      }

      const updated = await prisma.fanSubscription.update({
        where: { id: existing.id },
        data: { tierId: newTier.id },
        include: { tier: true },
      });

      logger.info(`Fan subscription upgraded: ${existing.tier.name} → ${newTier.name} for user ${req.user!.userId}`);
      res.json({ subscription: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/fan-subscriptions/cancel — Cancel fan subscription ──

fanSubscriptionRouter.post(
  '/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId } = z.object({ creatorId: z.string() }).parse(req.body);

      const sub = await prisma.fanSubscription.findUnique({
        where: { userId_creatorId: { userId: req.user!.userId, creatorId } },
      });
      if (!sub || sub.status !== 'ACTIVE') {
        throw new AppError(404, 'No active subscription found');
      }

      if (stripe && sub.providerSubscriptionId) {
        await stripe.subscriptions.update(sub.providerSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      const updated = await prisma.fanSubscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true },
      });

      res.json({ subscription: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/fan-subscriptions/webhook/stripe — Stripe webhook ──

fanSubscriptionRouter.post(
  '/webhook/stripe',
  async (req: Request, res: Response) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    let event: Stripe.Event;

    if (env.STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers['stripe-signature'] as string;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        logger.error(`Fan sub webhook signature failed: ${err.message}`);
        return res.status(400).json({ error: 'Webhook signature failed' });
      }
    } else {
      event = req.body;
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const meta = sub.metadata;
          if (meta.type !== 'fan_subscription') break;

          const status = mapStripeStatus(sub.status);
          await prisma.fanSubscription.upsert({
            where: {
              userId_creatorId: {
                userId: meta.userId,
                creatorId: meta.creatorId,
              },
            },
            update: {
              tierId: meta.tierId,
              status,
              providerSubscriptionId: sub.id,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            create: {
              userId: meta.userId,
              creatorId: meta.creatorId,
              tierId: meta.tierId,
              status,
              provider: 'STRIPE',
              providerSubscriptionId: sub.id,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });

          // Track revenue for creator
          if (status === 'ACTIVE') {
            const tier = await prisma.creatorTier.findUnique({ where: { id: meta.tierId } });
            if (tier) {
              const platformFee = Math.round(tier.priceCents * PLATFORM_FEE_PERCENT / 100);
              const creatorNet = tier.priceCents - platformFee;
              await prisma.creatorProfile.update({
                where: { id: meta.creatorId },
                data: { totalEarnings: { increment: creatorNet } },
              });
            }
          }

          logger.info(`Fan subscription ${event.type}: user=${meta.userId}, creator=${meta.creatorId}, status=${status}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const meta = sub.metadata;
          if (meta.type !== 'fan_subscription') break;

          await prisma.fanSubscription.update({
            where: {
              userId_creatorId: {
                userId: meta.userId,
                creatorId: meta.creatorId,
              },
            },
            data: {
              status: 'CANCELED',
              endsAt: new Date(),
            },
          });

          logger.info(`Fan subscription canceled: user=${meta.userId}, creator=${meta.creatorId}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (subId) {
            await prisma.fanSubscription.updateMany({
              where: { providerSubscriptionId: subId },
              data: { status: 'PAST_DUE' },
            });
          }
          break;
        }
      }
    } catch (err) {
      logger.error('Fan subscription webhook error:', err);
    }

    res.json({ received: true });
  }
);

// ─── POST /api/fan-subscriptions/webhook/apple — Apple IAP webhook ──

fanSubscriptionRouter.post(
  '/webhook/apple',
  async (req: Request, res: Response) => {
    // Apple Server Notifications V2 handler
    // In production: verify signedPayload JWT, decode transaction info
    // Map Apple product IDs to internal tier IDs
    logger.info('Apple IAP webhook received (handler placeholder)');
    res.json({ received: true });
  }
);

// ─── GET /api/fan-subscriptions/creator/:creatorId/subscribers — Creator's subscribers ──

fanSubscriptionRouter.get(
  '/creator/:creatorId/subscribers',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only the creator can see their subscribers
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator || creator.id !== req.params.creatorId) {
        throw new AppError(403, 'Not authorized');
      }

      const subs = await prisma.fanSubscription.findMany({
        where: { creatorId: creator.id, status: 'ACTIVE' },
        include: {
          tier: { select: { name: true, priceCents: true } },
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        },
        orderBy: { startedAt: 'asc' },
      });

      res.json({ subscribers: subs });
    } catch (err) {
      next(err);
    }
  }
);

function mapStripeStatus(stripeStatus: string): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}
