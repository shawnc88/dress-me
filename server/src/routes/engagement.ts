import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';

export const engagementRouter = Router();

// ─── VIEWER PRESENCE ─────────────────────────────────────────────

// POST /api/engagement/:streamId/join — Viewer joins stream
engagementRouter.post('/:streamId/join', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streamId = req.params.streamId;

    const userId = req.user?.userId || null;
    const guestToken = !userId ? `guest_${Date.now()}_${Math.random().toString(36).slice(2)}` : null;

    const session = await prisma.viewerSession.create({
      data: {
        streamId,
        userId,
        guestToken,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    // Update stream viewer count
    await prisma.stream.update({
      where: { id: streamId },
      data: { viewerCount: { increment: 1 } },
    }).catch(() => {});

    // Track engagement event
    if (userId) {
      const stream = await prisma.stream.findUnique({ where: { id: streamId }, select: { creatorId: true } });
      if (stream) {
        await prisma.feedEvent.create({
          data: { userId, creatorId: stream.creatorId, streamId, event: 'view_join' },
        }).catch(() => {});
      }
    }

    res.json({ sessionId: session.id, guestToken: session.guestToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/engagement/:streamId/ping — Heartbeat (every 15-20s)
engagementRouter.post('/:streamId/ping', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);

    await prisma.viewerSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/engagement/:streamId/leave — Viewer leaves
engagementRouter.post('/:streamId/leave', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);

    await prisma.viewerSession.update({
      where: { id: sessionId },
      data: { isActive: false, leftAt: new Date() },
    }).catch(() => {});

    await prisma.stream.update({
      where: { id: req.params.streamId },
      data: { viewerCount: { decrement: 1 } },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/engagement/:streamId/viewer-count — Live viewer count
engagementRouter.get('/:streamId/viewer-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clean up stale sessions (lastSeenAt > 45 seconds ago)
    const staleThreshold = new Date(Date.now() - 45000);
    await prisma.viewerSession.updateMany({
      where: {
        streamId: req.params.streamId,
        isActive: true,
        lastSeenAt: { lt: staleThreshold },
      },
      data: { isActive: false, leftAt: new Date() },
    });

    const count = await prisma.viewerSession.count({
      where: { streamId: req.params.streamId, isActive: true },
    });

    // Sync stream.viewerCount
    await prisma.stream.update({
      where: { id: req.params.streamId },
      data: { viewerCount: count },
    }).catch(() => {});

    // Update peak viewers
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.streamId },
      select: { peakViewers: true },
    });
    if (stream && count > stream.peakViewers) {
      await prisma.stream.update({
        where: { id: req.params.streamId },
        data: { peakViewers: count },
      }).catch(() => {});
    }

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// ─── LIVE ENGAGEMENT TRACKING ────────────────────────────────────

const engagementEventSchema = z.object({
  type: z.enum([
    'like', 'comment', 'gift_sent', 'follow_creator',
    'share_stream', 'tier_click', 'tier_subscribe',
  ]),
  value: z.number().optional(),
});

// POST /api/engagement/:streamId/event — Track engagement event
engagementRouter.post('/:streamId/event', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, value } = engagementEventSchema.parse(req.body);
    const streamId = req.params.streamId;

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { creatorId: true },
    });
    if (!stream) return res.status(404).json({ error: 'Stream not found' });

    await prisma.feedEvent.create({
      data: {
        userId: req.user!.userId,
        creatorId: stream.creatorId,
        streamId,
        event: type,
        meta: value !== undefined ? { value } : undefined,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/engagement/:streamId/metrics — Live stream metrics
engagementRouter.get('/:streamId/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streamId = req.params.streamId;

    const [stream, viewerCount, events, giftAgg] = await Promise.all([
      prisma.stream.findUnique({
        where: { id: streamId },
        select: { viewerCount: true, peakViewers: true, creatorId: true },
      }),
      prisma.viewerSession.count({ where: { streamId, isActive: true } }),
      prisma.feedEvent.groupBy({
        by: ['event'],
        where: { streamId },
        _count: true,
      }),
      prisma.gift.aggregate({
        where: { streamId },
        _sum: { threads: true },
        _count: true,
      }),
    ]);

    const eventMap = new Map(events.map((e) => [e.event, e._count]));

    const likes = eventMap.get('like') || 0;
    const comments = eventMap.get('comment') || 0;
    const shares = eventMap.get('share_stream') || 0;
    const follows = eventMap.get('follow_creator') || 0;
    const tierClicks = eventMap.get('tier_click') || 0;
    const tierSubs = eventMap.get('tier_subscribe') || 0;
    const giftCount = giftAgg._count || 0;
    const giftThreads = giftAgg._sum.threads || 0;

    const engagementScore =
      (viewerCount * 1) +
      (likes * 2) +
      (comments * 3) +
      (shares * 4) +
      (follows * 5) +
      (tierSubs * 10) +
      (giftThreads * 0.5);

    res.json({
      metrics: {
        currentViewers: viewerCount,
        peakViewers: stream?.peakViewers || 0,
        likes,
        comments,
        gifts: giftCount,
        giftThreads,
        shares,
        followConversions: follows,
        tierClicks,
        tierSubscriptions: tierSubs,
        engagementScore: Math.round(engagementScore),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── CREATOR EARNINGS ────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.20; // 20% platform fee
const THREAD_TO_CENTS = 100 / 210; // 210 threads = $1

// GET /api/engagement/earnings/:streamId — Per-stream earnings
engagementRouter.get('/earnings/:streamId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streamId = req.params.streamId;

    // Verify stream belongs to this creator
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: { creator: true },
    });
    if (!stream || stream.creator.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not your stream' });
    }

    // Get gift revenue
    const gifts = await prisma.gift.findMany({
      where: { streamId },
      select: { id: true, giftType: true, threads: true, createdAt: true },
    });

    const giftCents = Math.round(gifts.reduce((sum, g) => sum + g.threads, 0) * THREAD_TO_CENTS);
    const grossCents = giftCents;
    const feeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
    const netCents = grossCents - feeCents;

    // Get stored revenue records (for tips, subscriptions, etc.)
    const storedRevenue = await prisma.streamRevenue.aggregate({
      where: { streamId },
      _sum: { grossAmountCents: true, platformFeeCents: true, creatorNetCents: true },
    });

    const totalGross = grossCents + (storedRevenue._sum.grossAmountCents || 0);
    const totalFee = feeCents + (storedRevenue._sum.platformFeeCents || 0);
    const totalNet = netCents + (storedRevenue._sum.creatorNetCents || 0);

    // Get stream stats
    const [viewerSessions, eventCounts] = await Promise.all([
      prisma.viewerSession.count({ where: { streamId } }),
      prisma.feedEvent.groupBy({
        by: ['event'],
        where: { streamId },
        _count: true,
      }),
    ]);

    const eventMap = new Map(eventCounts.map((e) => [e.event, e._count]));

    res.json({
      earnings: {
        streamId,
        title: stream.title,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        grossCents: totalGross,
        feeCents: totalFee,
        netCents: totalNet,
        giftCents,
        giftCount: gifts.length,
        grossUsd: (totalGross / 100).toFixed(2),
        netUsd: (totalNet / 100).toFixed(2),
      },
      stats: {
        totalViewers: viewerSessions,
        peakViewers: stream.peakViewers,
        likes: eventMap.get('like') || 0,
        comments: eventMap.get('comment') || 0,
        follows: eventMap.get('follow_creator') || 0,
        shares: eventMap.get('share_stream') || 0,
        earningsPerViewer: viewerSessions > 0 ? ((totalNet / 100) / viewerSessions).toFixed(2) : '0.00',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/engagement/earnings-summary — Creator's overall earnings dashboard
engagementRouter.get('/earnings-summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) return res.status(403).json({ error: 'Creator profile required' });

    // All streams for this creator
    const streams = await prisma.stream.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true, title: true, startedAt: true, endedAt: true,
        peakViewers: true, status: true,
        _count: { select: { gifts: true, chatMessages: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Total gift revenue across all streams
    const totalGifts = await prisma.gift.aggregate({
      where: { stream: { creatorId: creator.id } },
      _sum: { threads: true },
      _count: true,
    });

    const totalThreads = totalGifts._sum.threads || 0;
    const totalGrossCents = Math.round(totalThreads * THREAD_TO_CENTS);
    const totalFeeCents = Math.round(totalGrossCents * PLATFORM_FEE_RATE);
    const totalNetCents = totalGrossCents - totalFeeCents;

    // Per-stream earnings
    const streamGifts = await prisma.gift.groupBy({
      by: ['streamId'],
      where: { stream: { creatorId: creator.id } },
      _sum: { threads: true },
      _count: true,
    });
    const giftMap = new Map(streamGifts.map((g) => [g.streamId, {
      threads: g._sum.threads || 0,
      count: g._count,
    }]));

    const streamEarnings = streams.map((s) => {
      const gifts = giftMap.get(s.id) || { threads: 0, count: 0 };
      const gross = Math.round(gifts.threads * THREAD_TO_CENTS);
      const fee = Math.round(gross * PLATFORM_FEE_RATE);
      const net = gross - fee;
      return {
        streamId: s.id,
        title: s.title,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        peakViewers: s.peakViewers,
        chatMessages: s._count.chatMessages,
        giftCount: gifts.count,
        grossCents: gross,
        netCents: net,
        grossUsd: (gross / 100).toFixed(2),
        netUsd: (net / 100).toFixed(2),
      };
    });

    // Best stream
    const bestStream = streamEarnings.reduce((best, s) =>
      s.netCents > (best?.netCents || 0) ? s : best, streamEarnings[0] || null
    );

    res.json({
      summary: {
        totalStreams: streams.length,
        totalGiftCount: totalGifts._count || 0,
        totalGrossUsd: (totalGrossCents / 100).toFixed(2),
        totalNetUsd: (totalNetCents / 100).toFixed(2),
        threadBalance: creator.threadBalance,
        platformFeeRate: `${PLATFORM_FEE_RATE * 100}%`,
      },
      bestStream,
      streams: streamEarnings,
    });
  } catch (err) {
    next(err);
  }
});
