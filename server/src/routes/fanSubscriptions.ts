import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { verifyAppleNotification, verifyAppleTransaction } from '../services/appleIap';

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

      // Atomic slot limit check + existing subscription check inside transaction
      // to prevent race conditions on concurrent checkouts
      await prisma.$transaction(async (tx) => {
        if (tier.slotLimit) {
          const activeCount = await tx.fanSubscription.count({
            where: { tierId: tier.id, status: 'ACTIVE' },
          });
          if (activeCount >= tier.slotLimit) {
            throw new AppError(400, 'This tier is full. No spots available.');
          }
        }

        const existing = await tx.fanSubscription.findUnique({
          where: { userId_creatorId: { userId: req.user!.userId, creatorId: tier.creatorId } },
        });
        if (existing?.status === 'ACTIVE') {
          throw new AppError(400, 'Already subscribed to this creator. Use upgrade endpoint.');
        }
      }, { isolationLevel: 'Serializable' });

      if (!stripe) {
        if (env.NODE_ENV === 'production') {
          throw new AppError(503, 'Payment provider not configured');
        }
        // Dev mode: create subscription directly (inside its own transaction for slot safety)
        const sub = await prisma.$transaction(async (tx) => {
          // Re-check slot limit inside transaction
          if (tier.slotLimit) {
            const activeCount = await tx.fanSubscription.count({
              where: { tierId: tier.id, status: 'ACTIVE' },
            });
            if (activeCount >= tier.slotLimit) {
              throw new AppError(400, 'This tier is full. No spots available.');
            }
          }

          return tx.fanSubscription.upsert({
            where: { userId_creatorId: { userId: req.user!.userId, creatorId: tier.creatorId } },
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
        }, { isolationLevel: 'Serializable' });

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
      // Re-read tier inside lock to prevent duplicate price creation race
      let priceId = tier.stripePriceId;
      if (!priceId) {
        // Re-check after potential concurrent update
        const freshTier = await prisma.creatorTier.findUnique({ where: { id: tier.id } });
        priceId = freshTier?.stripePriceId || null;

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
          // Use updateMany with where to only set if still null (CAS-like)
          await prisma.creatorTier.updateMany({
            where: { id: tier.id, stripePriceId: null },
            data: { stripePriceId: priceId },
          });

          // If another request already set it, use that one instead
          const finalTier = await prisma.creatorTier.findUnique({ where: { id: tier.id } });
          if (finalTier?.stripePriceId && finalTier.stripePriceId !== priceId) {
            priceId = finalTier.stripePriceId;
          }
        }
      }

      const clientUrl = env.CLIENT_URL || 'https://bewithme.live';

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
    } else if (env.NODE_ENV === 'production') {
      logger.error('STRIPE_WEBHOOK_SECRET not configured in production — rejecting webhook');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    } else {
      event = req.body;
    }

    // Idempotency check — skip if we've already processed this event
    const eventId = event.id;
    if (eventId) {
      const existing = await prisma.webhookEventLog.findUnique({ where: { id: eventId } });
      if (existing) {
        logger.info(`Webhook event ${eventId} already processed, skipping`);
        return res.json({ received: true, duplicate: true });
      }
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const meta = sub.metadata;
          if (meta.type !== 'fan_subscription') break;

          const status = mapStripeStatus(sub.status);

          // Check previous status to only track revenue on transitions TO active
          const prevSub = await prisma.fanSubscription.findUnique({
            where: { userId_creatorId: { userId: meta.userId, creatorId: meta.creatorId } },
          });
          const wasActive = prevSub?.status === 'ACTIVE';

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

          // Track revenue only on NEW activation (not re-processing same active state)
          if (status === 'ACTIVE' && !wasActive) {
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

        case 'invoice.paid': {
          // Revenue confirmation — subscription renewals
          const invoice = event.data.object as Stripe.Invoice;
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (!subId) break;

          // Re-activate PAST_DUE subscriptions on successful payment
          await prisma.fanSubscription.updateMany({
            where: { providerSubscriptionId: subId, status: 'PAST_DUE' },
            data: { status: 'ACTIVE' },
          });

          // Track renewal revenue. Initial activation is already credited in
          // customer.subscription.created. Here we only credit renewal cycles.
          const billingReason = invoice.billing_reason;
          const isRenewal =
            billingReason === 'subscription_cycle' ||
            billingReason === 'subscription_threshold';
          if (!isRenewal) break;

          // Per-invoice idempotency — prevents double-credit on webhook retries
          const invoiceEventId = `stripe_invoice_${invoice.id}`;
          const alreadyCredited = await prisma.webhookEventLog.findUnique({
            where: { id: invoiceEventId },
          });
          if (alreadyCredited) break;

          const fanSub = await prisma.fanSubscription.findFirst({
            where: { providerSubscriptionId: subId },
            include: { tier: true },
          });
          if (!fanSub?.tier) break;

          const platformFee = Math.round(fanSub.tier.priceCents * PLATFORM_FEE_PERCENT / 100);
          const creatorNet = fanSub.tier.priceCents - platformFee;
          await prisma.creatorProfile.update({
            where: { id: fanSub.creatorId },
            data: { totalEarnings: { increment: creatorNet } },
          });
          await prisma.webhookEventLog.create({
            data: { id: invoiceEventId, provider: 'stripe', eventType: 'invoice.paid.renewal' },
          }).catch(() => {});

          logger.info(`Stripe renewal: user=${fanSub.userId}, creator=${fanSub.creatorId}, invoice=${invoice.id}, creatorNet=${creatorNet}`);
          break;
        }
      }

      // Log event as processed for idempotency
      if (eventId) {
        await prisma.webhookEventLog.create({
          data: { id: eventId, provider: 'stripe', eventType: event.type },
        }).catch(() => {}); // ignore dup key race
      }
    } catch (err) {
      logger.error('Fan subscription webhook error:', err);
    }

    res.json({ received: true });
  }
);

// ─── POST /api/fan-subscriptions/webhook/apple — Apple IAP webhook ──

// ─── Apple IAP product → tier mapping ──
const APPLE_PRODUCT_TIER_MAP: Record<string, string> = {
  'supporter_monthly': 'SUPPORTER',
  'supporter_yearly': 'SUPPORTER',
  'vip_monthly': 'VIP',
  'vip_yearly': 'VIP',
  'inner_circle_monthly': 'INNER_CIRCLE',
  'inner_circle_yearly': 'INNER_CIRCLE',
};

fanSubscriptionRouter.post(
  '/webhook/apple',
  async (req: Request, res: Response) => {
    try {
      // Apple Server Notifications V2 sends { signedPayload: "JWS..." }
      const { signedPayload } = req.body;
      if (!signedPayload) {
        logger.warn('Apple webhook: missing signedPayload');
        return res.status(400).json({ error: 'Missing signedPayload' });
      }

      // Verify JWS signature, certificate chain, and decode payload
      let notification;
      try {
        notification = verifyAppleNotification(signedPayload);
      } catch (err: any) {
        logger.error(`Apple webhook: JWS verification failed: ${err.message}`);
        return res.status(400).json({ error: 'Invalid signed payload' });
      }

      const { notificationType, subtype, notificationUUID, transaction: txInfo } = notification;
      const { originalTransactionId, productId, expiresDate, appAccountToken } = txInfo;

      if (!originalTransactionId || !productId || !appAccountToken) {
        logger.warn('Apple webhook: missing required fields in verified transaction');
        return res.json({ received: true });
      }

      // Idempotency check
      const eventId = notificationUUID || `apple_${originalTransactionId}_${notificationType}_${subtype || 'none'}`;
      const existing = await prisma.webhookEventLog.findUnique({ where: { id: eventId } });
      if (existing) {
        logger.info(`Apple webhook event ${eventId} already processed`);
        return res.json({ received: true, duplicate: true });
      }

      // Map Apple product ID to tier
      const tierName = APPLE_PRODUCT_TIER_MAP[productId];
      if (!tierName) {
        logger.warn(`Apple webhook: unknown productId ${productId}`);
        return res.json({ received: true });
      }

      // appAccountToken format: "userId:creatorId"
      const [userId, creatorId] = appAccountToken.split(':');
      if (!userId || !creatorId) {
        logger.warn('Apple webhook: invalid appAccountToken format');
        return res.json({ received: true });
      }

      // Find the matching tier for this creator
      const tier = await prisma.creatorTier.findUnique({
        where: { creatorId_name: { creatorId, name: tierName as any } },
      });
      if (!tier) {
        logger.warn(`Apple webhook: no tier ${tierName} for creator ${creatorId}`);
        return res.json({ received: true });
      }

      switch (notificationType) {
        case 'SUBSCRIBED':
        case 'DID_RENEW':
        case 'OFFER_REDEEMED': {
          await prisma.fanSubscription.upsert({
            where: { userId_creatorId: { userId, creatorId } },
            update: {
              tierId: tier.id,
              status: 'ACTIVE',
              provider: 'APPLE_IAP',
              providerSubscriptionId: originalTransactionId,
              currentPeriodEnd: expiresDate ? new Date(expiresDate) : null,
              cancelAtPeriodEnd: false,
            },
            create: {
              userId,
              creatorId,
              tierId: tier.id,
              status: 'ACTIVE',
              provider: 'APPLE_IAP',
              providerSubscriptionId: originalTransactionId,
              currentPeriodEnd: expiresDate ? new Date(expiresDate) : null,
            },
          });

          // Track revenue on every subscription event (initial + renewals)
          const platformFee = Math.round(tier.priceCents * PLATFORM_FEE_PERCENT / 100);
          const creatorNet = tier.priceCents - platformFee;
          await prisma.creatorProfile.update({
            where: { id: creatorId },
            data: { totalEarnings: { increment: creatorNet } },
          });

          logger.info(`Apple subscription ${notificationType}: user=${userId}, creator=${creatorId}, tier=${tierName}`);
          break;
        }

        case 'DID_CHANGE_RENEWAL_STATUS': {
          if (subtype === 'AUTO_RENEW_DISABLED') {
            await prisma.fanSubscription.updateMany({
              where: { providerSubscriptionId: originalTransactionId },
              data: { cancelAtPeriodEnd: true },
            });
          } else if (subtype === 'AUTO_RENEW_ENABLED') {
            await prisma.fanSubscription.updateMany({
              where: { providerSubscriptionId: originalTransactionId },
              data: { cancelAtPeriodEnd: false },
            });
          }
          break;
        }

        case 'EXPIRED':
        case 'REVOKE': {
          await prisma.fanSubscription.updateMany({
            where: { providerSubscriptionId: originalTransactionId },
            data: { status: 'CANCELED', endsAt: new Date() },
          });
          logger.info(`Apple subscription ${notificationType}: txId=${originalTransactionId}`);
          break;
        }

        case 'DID_FAIL_TO_RENEW': {
          await prisma.fanSubscription.updateMany({
            where: { providerSubscriptionId: originalTransactionId },
            data: { status: 'PAST_DUE' },
          });
          break;
        }

        case 'DID_CHANGE_RENEWAL_INFO': {
          // Upgrade / downgrade — product may have changed
          if (txInfo.productId) {
            const newTierName = APPLE_PRODUCT_TIER_MAP[txInfo.productId];
            if (newTierName) {
              const newTier = await prisma.creatorTier.findUnique({
                where: { creatorId_name: { creatorId, name: newTierName as any } },
              });
              if (newTier) {
                await prisma.fanSubscription.updateMany({
                  where: { providerSubscriptionId: originalTransactionId },
                  data: { tierId: newTier.id },
                });
              }
            }
          }
          break;
        }
      }

      // Log event as processed
      await prisma.webhookEventLog.create({
        data: { id: eventId, provider: 'apple', eventType: `${notificationType}_${subtype || ''}` },
      }).catch(() => {});

    } catch (err) {
      logger.error('Apple IAP webhook error:', err);
    }

    res.json({ received: true });
  }
);

// ─── POST /api/fan-subscriptions/restore — Restore Apple IAP purchases ──

fanSubscriptionRouter.post(
  '/restore',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Accept both JWS-signed transactions and pre-verified transaction objects.
      // Native StoreKit 2 verifies transactions locally before sending, so we accept
      // pre-verified JSON from the native app. JWS verification is still used for
      // server-to-server Apple webhook notifications.
      const { signedTransactions } = z.object({
        signedTransactions: z.array(z.object({
          signedTransaction: z.string(),
          creatorId: z.string(),
        })),
      }).parse(req.body);

      const restored: string[] = [];
      const errors: string[] = [];

      for (const item of signedTransactions) {
        try {
          // All transactions must pass JWS signature verification — no JSON fallback
          const tx = verifyAppleTransaction(item.signedTransaction);
          const { productId, originalTransactionId, expiresDate } = tx;

          const tierName = APPLE_PRODUCT_TIER_MAP[productId];
          if (!tierName) continue;

          const tier = await prisma.creatorTier.findUnique({
            where: { creatorId_name: { creatorId: item.creatorId, name: tierName as any } },
          });
          if (!tier) continue;

          const isExpired = expiresDate && expiresDate < Date.now();
          if (isExpired) continue;

          await prisma.fanSubscription.upsert({
            where: { userId_creatorId: { userId: req.user!.userId, creatorId: item.creatorId } },
            update: {
              tierId: tier.id,
              status: 'ACTIVE',
              provider: 'APPLE_IAP',
              providerSubscriptionId: originalTransactionId,
              currentPeriodEnd: expiresDate ? new Date(expiresDate) : null,
            },
            create: {
              userId: req.user!.userId,
              creatorId: item.creatorId,
              tierId: tier.id,
              status: 'ACTIVE',
              provider: 'APPLE_IAP',
              providerSubscriptionId: originalTransactionId,
              currentPeriodEnd: expiresDate ? new Date(expiresDate) : null,
            },
          });

          restored.push(item.creatorId);
        } catch (err: any) {
          errors.push(`${item.creatorId}: ${err.message}`);
          logger.warn(`Restore failed for creator ${item.creatorId}: ${err.message}`);
        }
      }

      logger.info(`Apple IAP restore: user=${req.user!.userId}, restored=${restored.length}, errors=${errors.length}`);
      res.json({ restored, count: restored.length, errors: errors.length > 0 ? errors : undefined });
    } catch (err) {
      next(err);
    }
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
