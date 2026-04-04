import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { createMuxUpload, getMuxUploadStatus, getMuxAssetPlaybackId, isMuxConfigured } from '../services/streaming/mux';
import { logger } from '../utils/logger';

export const reelRouter = Router();

// POST /api/reels/upload — Get Mux direct upload URL
reelRouter.post('/upload', authenticate, requireRole('CREATOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMuxConfigured()) throw new AppError(503, 'Video upload not available');
    const upload = await createMuxUpload();
    logger.info(`Reel upload created: ${upload.uploadId}`);
    res.json(upload);
  } catch (err) {
    next(err);
  }
});

// GET /api/reels/upload/:uploadId/status — Poll upload status
reelRouter.get('/upload/:uploadId/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assetId } = await getMuxUploadStatus(req.params.uploadId);

    let playbackId: string | null = null;
    let duration: number | null = null;
    let assetStatus = 'waiting';

    if (assetId) {
      const asset = await getMuxAssetPlaybackId(assetId);
      playbackId = asset.playbackId;
      duration = asset.duration;
      assetStatus = asset.status;
    }

    res.json({ uploadStatus: status, assetId, assetStatus, playbackId, duration });
  } catch (err) {
    next(err);
  }
});

// GET /api/reels — Latest reels (paginated)
reelRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '20', cursor } = req.query;

    const reels = await prisma.reel.findMany({
      take: Number(limit),
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    // Fetch creators
    const creatorIds = [...new Set(reels.map(r => r.creatorId))];
    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: creatorIds } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    const enriched = reels.map(r => ({
      ...r,
      creator: creatorMap.get(r.creatorId)?.user || null,
    }));

    const nextCursor = reels.length === Number(limit) ? reels[reels.length - 1].id : null;

    res.json({ reels: enriched, nextCursor });
  } catch (err) {
    next(err);
  }
});

// GET /api/reels/suggested — Algorithm-driven feed
reelRouter.get('/suggested', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { limit = '20' } = req.query;

    // Fetch recent reels with engagement data
    const reels = await prisma.reel.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // last 7 days
    });

    // Get engagement data if user is logged in
    let seenReelIds = new Set<string>();
    if (userId) {
      const engagements = await prisma.reelEngagement.findMany({
        where: { userId, reelId: { in: reels.map(r => r.id) } },
        select: { reelId: true },
      });
      seenReelIds = new Set(engagements.map(e => e.reelId));
    }

    // Score each reel
    const now = Date.now();
    const scored = reels.map(reel => {
      const ageHours = (now - reel.createdAt.getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 100 - ageHours * 2); // decays over ~50 hours
      const engagementScore =
        reel.viewsCount * 1 +
        reel.likesCount * 3 +
        reel.commentsCount * 4 +
        reel.sharesCount * 5;
      const newCreatorBoost = reel.viewsCount < 100 ? 50 : 0;
      const seenPenalty = seenReelIds.has(reel.id) ? -200 : 0;

      return {
        reel,
        score: engagementScore + recencyBoost + newCreatorBoost + seenPenalty,
      };
    });

    // Sort by score, take top N
    scored.sort((a, b) => b.score - a.score);
    const topReels = scored.slice(0, Number(limit)).map(s => s.reel);

    // Enrich with creator data
    const creatorIds = [...new Set(topReels.map(r => r.creatorId))];
    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: creatorIds } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    const enriched = topReels.map(r => ({
      ...r,
      creator: creatorMap.get(r.creatorId)?.user || null,
    }));

    res.json({ reels: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/reels — Create a reel (creators only)
reelRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = z.object({
        videoUrl: z.string().url(),
        muxPlaybackId: z.string().optional(),
        muxAssetId: z.string().optional(),
        thumbnailUrl: z.string().url().optional(),
        caption: z.string().max(500).optional(),
        hashtags: z.array(z.string().max(50)).max(10).default([]),
        duration: z.number().int().positive().optional(),
      }).parse(req.body);

      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const reel = await prisma.reel.create({
        data: {
          creatorId: creator.id,
          videoUrl: data.videoUrl,
          muxAssetId: data.muxAssetId,
          muxPlaybackId: data.muxPlaybackId,
          thumbnailUrl: data.thumbnailUrl,
          caption: data.caption,
          hashtags: data.hashtags.map(t => t.toLowerCase().replace(/^#/, '')),
          duration: data.duration,
        },
      });

      res.status(201).json({ reel });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/reels/:id/like — Toggle like
reelRouter.post('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reelId = req.params.id;
    const userId = req.user!.userId;

    const existing = await prisma.reelLike.findUnique({
      where: { reelId_userId: { reelId, userId } },
    });

    if (existing) {
      await prisma.reelLike.delete({ where: { id: existing.id } });
      await prisma.reel.update({ where: { id: reelId }, data: { likesCount: { decrement: 1 } } });
      res.json({ liked: false });
    } else {
      await prisma.reelLike.create({ data: { reelId, userId } });
      await prisma.reel.update({ where: { id: reelId }, data: { likesCount: { increment: 1 } } });
      res.json({ liked: true });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/reels/:id/comment — Add comment
reelRouter.post('/:id/comment', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({ content: z.string().min(1).max(500) }).parse(req.body);

    const comment = await prisma.reelComment.create({
      data: {
        reelId: req.params.id,
        userId: req.user!.userId,
        content: data.content,
      },
    });

    await prisma.reel.update({
      where: { id: req.params.id },
      data: { commentsCount: { increment: 1 } },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// GET /api/reels/:id/comments — Get comments
reelRouter.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.reelComment.findMany({
      where: { reelId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const userIds = [...new Set(comments.map(c => c.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = comments.map(c => ({
      ...c,
      user: userMap.get(c.userId) || null,
    }));

    res.json({ comments: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/reels/:id/view — Track view
reelRouter.post('/:id/view', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.reel.update({
      where: { id: req.params.id },
      data: { viewsCount: { increment: 1 } },
    });

    const userId = (req as any).user?.userId;
    if (userId) {
      const watchTimeMs = z.number().int().min(0).max(300000).optional().parse(req.body?.watchTimeMs) || 0;
      await prisma.reelEngagement.upsert({
        where: { reelId_userId: { reelId: req.params.id, userId } },
        update: {
          watchTimeMs: { increment: watchTimeMs },
          completed: watchTimeMs > 10000,
        },
        create: {
          reelId: req.params.id,
          userId,
          watchTimeMs,
          completed: watchTimeMs > 10000,
        },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/reels/:id/share — Increment share count
reelRouter.post('/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.reel.update({
      where: { id: req.params.id },
      data: { sharesCount: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
