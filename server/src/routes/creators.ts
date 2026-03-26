import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

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

    res.status(201).json({ profile });
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
