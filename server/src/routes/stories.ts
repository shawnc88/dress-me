import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const storyRouter = Router();

// GET /api/stories — Get all active stories grouped by creator
storyRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    // Get all unexpired stories
    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique creator IDs
    const creatorIds = [...new Set(stories.map(s => s.creatorId))];

    // Fetch creator profiles with user info
    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: creatorIds } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    const creatorMap = new Map(creators.map(c => [c.id, c]));

    // Group stories by creator
    const grouped = creatorIds.map(cid => {
      const creator = creatorMap.get(cid);
      if (!creator) return null;
      return {
        creatorId: cid,
        user: creator.user,
        stories: stories.filter(s => s.creatorId === cid),
      };
    }).filter(Boolean);

    res.json({ storyGroups: grouped });
  } catch (err) {
    next(err);
  }
});

// POST /api/stories — Create a story (creators only)
storyRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = z.object({
        mediaUrl: z.string().url(),
        mediaType: z.enum(['image', 'video']).default('image'),
        caption: z.string().max(200).optional(),
      }).parse(req.body);

      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const story = await prisma.story.create({
        data: {
          creatorId: creator.id,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          caption: data.caption,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      res.status(201).json({ story });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/stories/:id/view — Mark story as viewed
storyRouter.post('/:id/view', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storyId = req.params.id;
    const userId = req.user!.userId;

    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: { viewedAt: new Date() },
      create: { storyId, userId },
    });

    await prisma.story.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/stories/:id/viewers — Get story viewers (creator only)
storyRouter.get('/:id/viewers', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const views = await prisma.storyView.findMany({
      where: { storyId: req.params.id },
      orderBy: { viewedAt: 'desc' },
      take: 50,
    });
    res.json({ viewers: views });
  } catch (err) {
    next(err);
  }
});
