import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';

export const creatorRouter = Router();

// Become a creator
creatorRouter.post('/apply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (existing) throw new AppError(400, 'Already a creator');

    const [profile] = await prisma.$transaction([
      prisma.creatorProfile.create({
        data: { userId: req.user!.userId },
      }),
      prisma.user.update({
        where: { id: req.user!.userId },
        data: { role: 'CREATOR' },
      }),
    ]);

    // Issue new token with CREATOR role
    const token = jwt.sign({ userId: req.user!.userId, role: 'CREATOR' }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.status(201).json({ profile, token });
  } catch (err) {
    next(err);
  }
});

// Complete creator onboarding
creatorRouter.post('/onboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bio, category, tierBasicPrice, tierPremiumPrice, tierElitePrice } = req.body;

    // Ensure user is a creator
    let creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!creator) {
      // Auto-create creator profile + promote role
      const [profile] = await prisma.$transaction([
        prisma.creatorProfile.create({
          data: { userId: req.user!.userId },
        }),
        prisma.user.update({
          where: { id: req.user!.userId },
          data: { role: 'CREATOR' },
        }),
      ]);
      creator = profile;
    }

    // Update creator profile with onboarding data
    const updated = await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        category: category || 'creator',
        tierBasicPrice: tierBasicPrice ?? 0,
        tierPremiumPrice: tierPremiumPrice ?? 999,
        tierElitePrice: tierElitePrice ?? 0,
        isOnboarded: true,
      },
      include: { user: { select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, role: true } } },
    });

    // Update user bio if provided
    if (bio) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { bio },
      });
    }

    // Issue new token with CREATOR role
    const token = jwt.sign({ userId: req.user!.userId, role: 'CREATOR' }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.json({ creator: updated, token });
  } catch (err) {
    next(err);
  }
});

// Get own creator profile with stats
creatorRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const streamAgg = await prisma.stream.aggregate({
      where: { creatorId: creator.id },
      _count: true,
      _sum: { peakViewers: true },
    });

    const giftAgg = await prisma.gift.aggregate({
      where: { stream: { creatorId: creator.id } },
      _sum: { threads: true },
    });

    res.json({
      creator,
      stats: {
        totalStreams: streamAgg._count,
        totalViewers: streamAgg._sum.peakViewers || 0,
        avgViewers: streamAgg._count > 0 ? Math.round((streamAgg._sum.peakViewers || 0) / streamAgg._count) : 0,
        totalGiftsReceived: giftAgg._sum.threads || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get creator dashboard stats
creatorRouter.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
      include: {
        streams: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            viewerCount: true,
            peakViewers: true,
            startedAt: true,
            endedAt: true,
          },
        },
        _count: { select: { streams: true, giveaways: true } },
      },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    // Calculate earnings in USD (210 threads = $1)
    const earningsUsd = (creator.threadBalance / 210).toFixed(2);

    res.json({
      profile: creator,
      stats: {
        totalStreams: creator._count.streams,
        totalGiveaways: creator._count.giveaways,
        threadBalance: creator.threadBalance,
        earningsUsd,
        recentStreams: creator.streams,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get detailed analytics for creator
creatorRouter.get('/analytics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const { days = '30' } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - Number(days));

    // All streams with full data
    const allStreams = await prisma.stream.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        streamType: true,
        viewerCount: true,
        peakViewers: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        _count: { select: { chatMessages: true, gifts: true } },
      },
    });

    // Streams in the requested period
    const periodStreams = allStreams.filter((s) => s.createdAt >= sinceDate);

    // Gift earnings breakdown (per stream, in period)
    const giftsByStream = await prisma.gift.groupBy({
      by: ['streamId'],
      where: {
        stream: { creatorId: creator.id },
        createdAt: { gte: sinceDate },
      },
      _sum: { threads: true },
      _count: true,
    });
    const giftMap = new Map(giftsByStream.map((g) => [g.streamId, { threads: g._sum.threads || 0, count: g._count }]));

    // Gift earnings by type
    const giftsByType = await prisma.gift.groupBy({
      by: ['giftType'],
      where: {
        stream: { creatorId: creator.id },
        createdAt: { gte: sinceDate },
      },
      _sum: { threads: true },
      _count: true,
      orderBy: { _sum: { threads: 'desc' } },
    });

    // Daily viewer data (for trend chart)
    const dailyStreams = await prisma.stream.findMany({
      where: {
        creatorId: creator.id,
        startedAt: { gte: sinceDate },
      },
      select: { startedAt: true, peakViewers: true, viewerCount: true },
      orderBy: { startedAt: 'asc' },
    });

    // Aggregate daily viewers
    const dailyViewers: Record<string, { viewers: number; streams: number }> = {};
    for (const s of dailyStreams) {
      if (!s.startedAt) continue;
      const day = s.startedAt.toISOString().slice(0, 10);
      if (!dailyViewers[day]) dailyViewers[day] = { viewers: 0, streams: 0 };
      dailyViewers[day].viewers += s.peakViewers;
      dailyViewers[day].streams += 1;
    }
    const viewerTrend = Object.entries(dailyViewers)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Totals
    const totalViewers = allStreams.reduce((sum, s) => sum + s.peakViewers, 0);
    const totalChatMessages = allStreams.reduce((sum, s) => sum + s._count.chatMessages, 0);
    const totalGifts = allStreams.reduce((sum, s) => sum + s._count.gifts, 0);

    // Average stream duration (minutes) for ended streams
    const endedStreams = allStreams.filter((s) => s.startedAt && s.endedAt);
    const avgDurationMin = endedStreams.length > 0
      ? Math.round(
          endedStreams.reduce((sum, s) => sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt!).getTime()), 0) /
          endedStreams.length / 60000
        )
      : 0;

    // Top 5 streams by peak viewers
    const topStreams = [...allStreams]
      .sort((a, b) => b.peakViewers - a.peakViewers)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        gifts: giftMap.get(s.id) || { threads: 0, count: 0 },
        durationMin: s.startedAt && s.endedAt
          ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
          : null,
      }));

    // Recent streams with enriched data
    const recentStreams = periodStreams.slice(0, 20).map((s) => ({
      ...s,
      gifts: giftMap.get(s.id) || { threads: 0, count: 0 },
      durationMin: s.startedAt && s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
        : null,
    }));

    res.json({
      summary: {
        totalStreams: allStreams.length,
        periodStreams: periodStreams.length,
        totalViewers,
        avgViewers: allStreams.length > 0 ? Math.round(totalViewers / allStreams.length) : 0,
        totalChatMessages,
        totalGifts,
        threadBalance: creator.threadBalance,
        earningsUsd: (creator.threadBalance / 210).toFixed(2),
        avgDurationMin,
      },
      viewerTrend,
      giftsByType: giftsByType.map((g) => ({
        type: g.giftType,
        threads: g._sum.threads || 0,
        count: g._count,
      })),
      topStreams,
      recentStreams,
    });
  } catch (err) {
    next(err);
  }
});

// Get stream key
creatorRouter.get('/stream-key', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { streamKey: true },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');
    res.json({ streamKey: creator.streamKey });
  } catch (err) {
    next(err);
  }
});
