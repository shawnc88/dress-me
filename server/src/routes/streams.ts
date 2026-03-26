import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const streamRouter = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  streamType: z.enum(['PUBLIC', 'PREMIUM', 'ELITE', 'PRIVATE']).default('PUBLIC'),
  scheduledFor: z.string().datetime().optional(),
});

// List live/upcoming streams
streamRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'LIVE', limit = '20', offset = '0' } = req.query;

    const streams = await prisma.stream.findMany({
      where: { status: status as any },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { viewerCount: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({ streams });
  } catch (err) {
    next(err);
  }
});

// Get single stream
streamRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
        polls: { where: { isActive: true } },
      },
    });
    if (!stream) throw new AppError(404, 'Stream not found');
    res.json({ stream });
  } catch (err) {
    next(err);
  }
});

// Create stream (creators only)
streamRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createStreamSchema.parse(req.body);
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const stream = await prisma.stream.create({
        data: {
          creatorId: creator.id,
          title: data.title,
          description: data.description,
          streamType: data.streamType as any,
          scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        },
      });

      res.status(201).json({ stream });
    } catch (err) {
      next(err);
    }
  }
);

// Go live
streamRouter.post(
  '/:id/live',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: { status: 'LIVE', startedAt: new Date() },
      });

      // Mark creator as live
      await prisma.creatorProfile.update({
        where: { userId: req.user!.userId },
        data: { isLive: true },
      });

      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);

// End stream
streamRouter.post(
  '/:id/end',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      await prisma.creatorProfile.update({
        where: { userId: req.user!.userId },
        data: { isLive: false },
      });

      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);
