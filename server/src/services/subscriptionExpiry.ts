import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Expire fan subscriptions whose currentPeriodEnd has passed.
 * Runs periodically to catch subscriptions that weren't caught by webhooks.
 */
async function expireSubscriptions() {
  try {
    const now = new Date();
    const result = await prisma.fanSubscription.updateMany({
      where: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lt: now },
      },
      data: {
        status: 'CANCELED',
        endsAt: now,
      },
    });

    if (result.count > 0) {
      logger.info(`Subscription expiry: ${result.count} subscriptions canceled (cancelAtPeriodEnd + expired)`);
    }

    // Also catch subscriptions past due for > 7 days
    const pastDueCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pastDueResult = await prisma.fanSubscription.updateMany({
      where: {
        status: 'PAST_DUE',
        currentPeriodEnd: { lt: pastDueCutoff },
      },
      data: {
        status: 'CANCELED',
        endsAt: now,
      },
    });

    if (pastDueResult.count > 0) {
      logger.info(`Subscription expiry: ${pastDueResult.count} past-due subscriptions canceled (>7 days)`);
    }
  } catch (err) {
    logger.error('Subscription expiry job failed:', err);
  }
}

/**
 * Start the subscription expiry checker.
 * Runs immediately on startup, then every hour.
 */
export function startSubscriptionExpiryJob() {
  logger.info('Subscription expiry job started (interval: 1h)');
  expireSubscriptions(); // run immediately
  setInterval(expireSubscriptions, EXPIRY_INTERVAL_MS);
}
