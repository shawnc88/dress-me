import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { getCreatorGrowthMetrics, generatePostStreamSummary, updateCreatorDailyMetrics } from '../services/creatorGrowth';

export const creatorGrowthRouter = Router();

// GET /api/creators/:id/growth-metrics — Creator growth dashboard
creatorGrowthRouter.get('/:id/growth-metrics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: req.params.id },
    });
    if (!creator) throw new AppError(404, 'Creator not found');
    if (creator.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new AppError(403, 'Not authorized');
    }

    const days = Number(req.query.days) || 30;
    const growth = await getCreatorGrowthMetrics(req.params.id, days);

    res.json(growth);
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/:id/post-stream-summary — Summary for a specific stream
creatorGrowthRouter.get('/:id/post-stream-summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streamId = req.query.streamId as string;
    if (!streamId) throw new AppError(400, 'streamId required');

    const summary = await prisma.postStreamSummary.findUnique({
      where: { streamId },
    });
    if (!summary) throw new AppError(404, 'Summary not found');

    // Enrich top fans
    let topFans: any[] = [];
    if (summary.topFanUserIds.length > 0) {
      topFans = await prisma.user.findMany({
        where: { id: { in: summary.topFanUserIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
    }

    res.json({ summary: { ...summary, topFans } });
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/:id/generate-summary — Trigger summary generation (after stream ends)
creatorGrowthRouter.post(
  '/:id/generate-summary',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { streamId } = req.body;
      if (!streamId) throw new AppError(400, 'streamId required');

      await generatePostStreamSummary(streamId);
      await updateCreatorDailyMetrics(req.params.id);

      const summary = await prisma.postStreamSummary.findUnique({ where: { streamId } });
      res.json({ summary });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/creators/:id/update-daily — Update daily growth metrics
creatorGrowthRouter.post(
  '/:id/update-daily',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateCreatorDailyMetrics(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);
