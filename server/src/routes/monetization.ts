import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';

export const monetizationRouter = Router();

// ─── EVENT TRACKING ─────────────────────────────────────────────

const VALID_EVENTS = [
  'coin_package_view',
  'coin_package_click',
  'coin_purchase_success',
  'gift_prompt_shown',
  'gift_prompt_clicked',
  'gift_prompt_dismissed',
  'low_balance_prompt_shown',
  'vip_prompt_shown',
  'vip_prompt_clicked',
  'vip_prompt_dismissed',
  'vip_upgrade_clicked',
  'leaderboard_view',
  'gift_callout_seen',
  'tier_comparison_view',
  'upgrade_prompt_shown',
  'upgrade_prompt_clicked',
  'upgrade_prompt_dismissed',
  'scarcity_badge_seen',
] as const;

const eventSchema = z.object({
  event: z.string(),
  meta: z.record(z.any()).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).max(20),
});

// POST /api/monetization/event — Track single event
monetizationRouter.post('/event', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, meta } = eventSchema.parse(req.body);
    await prisma.monetizationEvent.create({
      data: { userId: req.user!.userId, event, meta: meta || undefined },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/monetization/events — Batch track (up to 20)
monetizationRouter.post('/events', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { events } = batchSchema.parse(req.body);
    await prisma.monetizationEvent.createMany({
      data: events.map(e => ({
        userId: req.user!.userId,
        event: e.event,
        meta: e.meta || undefined,
      })),
    });
    res.json({ ok: true, count: events.length });
  } catch (err) {
    next(err);
  }
});

// ─── ALL-TIME SUPPORTER LEADERBOARD PER CREATOR ─────────────────

// GET /api/monetization/leaderboard/:creatorId — Top all-time gifters for a creator
monetizationRouter.get('/leaderboard/:creatorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.params.creatorId;

    // Get all streams for this creator
    const streams = await prisma.stream.findMany({
      where: { creatorId },
      select: { id: true },
    });
    const streamIds = streams.map(s => s.id);

    if (streamIds.length === 0) {
      return res.json({ leaderboard: [] });
    }

    // Aggregate gifts across all streams
    const gifts = await prisma.gift.groupBy({
      by: ['senderId'],
      where: { streamId: { in: streamIds } },
      _sum: { threads: true },
      _count: true,
      orderBy: { _sum: { threads: 'desc' } },
      take: 10,
    });

    const userIds = gifts.map(g => g.senderId);
    const [users, subscriptions] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      }),
      prisma.fanSubscription.findMany({
        where: { userId: { in: userIds }, creatorId, status: 'ACTIVE' },
        include: { tier: { select: { name: true } } },
      }),
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const subMap = new Map(subscriptions.map(s => [s.userId, s.tier?.name || null]));

    const leaderboard = gifts.map((g, i) => ({
      rank: i + 1,
      user: userMap.get(g.senderId) || { username: 'unknown', displayName: 'Unknown' },
      totalThreads: g._sum.threads || 0,
      giftCount: g._count,
      tier: subMap.get(g.senderId) || null,
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});

// ─── UPGRADE ELIGIBILITY ────────────────────────────────────────

// GET /api/monetization/upgrade-hint/:creatorId — Should we show upgrade prompt?
monetizationRouter.get('/upgrade-hint/:creatorId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const creatorId = req.params.creatorId;

    // Check current subscription
    const currentSub = await prisma.fanSubscription.findUnique({
      where: { userId_creatorId: { userId, creatorId } },
      include: { tier: true },
    });

    if (!currentSub || currentSub.status !== 'ACTIVE') {
      // Not subscribed — check engagement signals for subscribe prompt
      const [giftCount, viewSessions] = await Promise.all([
        prisma.gift.count({
          where: { senderId: userId, stream: { creatorId } },
        }),
        prisma.feedEvent.count({
          where: { userId, creatorId, event: { in: ['stream_join', 'view_join'] } },
        }),
      ]);

      return res.json({
        shouldPrompt: giftCount >= 2 || viewSessions >= 3,
        currentTier: null,
        suggestedAction: 'subscribe',
        reason: giftCount >= 2 ? 'frequent_gifter' : viewSessions >= 3 ? 'frequent_viewer' : null,
      });
    }

    // Already subscribed — check upgrade eligibility
    const tierOrder = ['SUPPORTER', 'VIP', 'INNER_CIRCLE'];
    const currentIndex = tierOrder.indexOf(currentSub.tier?.name || 'SUPPORTER');
    if (currentIndex >= tierOrder.length - 1) {
      return res.json({ shouldPrompt: false, currentTier: currentSub.tier?.name, suggestedAction: null });
    }

    // Check signals for upgrade
    const [recentGifts, recentViews] = await Promise.all([
      prisma.gift.count({
        where: {
          senderId: userId,
          stream: { creatorId },
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
      }),
      prisma.feedEvent.count({
        where: {
          userId, creatorId,
          event: { in: ['stream_join', 'view_join'] },
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
      }),
    ]);

    const nextTier = tierOrder[currentIndex + 1];
    const shouldPrompt = recentGifts >= 3 || recentViews >= 5;

    res.json({
      shouldPrompt,
      currentTier: currentSub.tier?.name,
      suggestedAction: shouldPrompt ? 'upgrade' : null,
      suggestedTier: shouldPrompt ? nextTier : null,
      reason: recentGifts >= 3 ? 'frequent_gifter' : recentViews >= 5 ? 'frequent_viewer' : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── SCARCITY DATA ──────────────────────────────────────────────

// GET /api/monetization/scarcity/:creatorId — Slots remaining per tier
monetizationRouter.get('/scarcity/:creatorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.params.creatorId;

    const tiers = await prisma.creatorTier.findMany({
      where: { creatorId, active: true },
      select: { id: true, name: true, slotLimit: true },
    });

    const tiersWithCounts = await Promise.all(tiers.map(async (tier) => {
      const subscriberCount = await prisma.fanSubscription.count({
        where: { tierId: tier.id, status: 'ACTIVE' },
      });
      return {
        name: tier.name,
        slotLimit: tier.slotLimit,
        subscriberCount,
        slotsRemaining: tier.slotLimit ? Math.max(0, tier.slotLimit - subscriberCount) : null,
      };
    }));

    res.json({ tiers: tiersWithCounts });
  } catch (err) {
    next(err);
  }
});

// ─── CONVERSION ANALYTICS (admin/creator) ───────────────────────

// GET /api/monetization/conversions — Funnel metrics
monetizationRouter.get('/conversions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 86400000);

    const counts = await prisma.monetizationEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    const map = new Map(counts.map(c => [c.event, c._count]));

    res.json({
      period: `${days}d`,
      funnel: {
        coin_package_view: map.get('coin_package_view') || 0,
        coin_package_click: map.get('coin_package_click') || 0,
        coin_purchase_success: map.get('coin_purchase_success') || 0,
        gift_prompt_shown: map.get('gift_prompt_shown') || 0,
        gift_prompt_clicked: map.get('gift_prompt_clicked') || 0,
        gift_prompt_dismissed: map.get('gift_prompt_dismissed') || 0,
        low_balance_prompt_shown: map.get('low_balance_prompt_shown') || 0,
        vip_prompt_shown: map.get('vip_prompt_shown') || 0,
        vip_upgrade_clicked: map.get('vip_upgrade_clicked') || 0,
        leaderboard_view: map.get('leaderboard_view') || 0,
        gift_callout_seen: map.get('gift_callout_seen') || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
