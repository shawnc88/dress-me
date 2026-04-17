import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { generateFeed } from '../services/feed/algorithm';
import { notifyNewFollower } from '../services/smartPush';

export const feedRouter = Router();

// GET /api/feed — Algorithmic feed
feedRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Optional auth — feed works for anonymous users too
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(
          authHeader.slice(7),
          process.env.JWT_SECRET || 'dev-secret',
        ) as { userId: string };
        userId = decoded.userId;
      } catch {
        // Invalid token is fine — just show anonymous feed
      }
    }

    const feed = await generateFeed(userId);
    res.json({ feed });
  } catch (err) {
    next(err);
  }
});

// POST /api/feed/event — Track feed events
feedRouter.post('/event', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { creatorId, streamId, event, meta } = req.body;

    if (!creatorId || !event) {
      return res.status(400).json({ error: 'creatorId and event are required' });
    }

    const validEvents = [
      'impression', 'view_start', 'view_3s', 'view_30s',
      'like', 'comment', 'follow', 'profile_open',
      'stream_join', 'tier_click', 'tier_subscribe',
      'skip', 'return_view',
    ];

    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: `Invalid event. Must be one of: ${validEvents.join(', ')}` });
    }

    await prisma.feedEvent.create({
      data: {
        userId: req.user!.userId,
        creatorId,
        streamId: streamId || null,
        event,
        meta: meta || null,
      },
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/feed/follow — Follow a creator
feedRouter.post('/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { creatorId } = req.body;
    if (!creatorId) return res.status(400).json({ error: 'creatorId is required' });

    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_creatorId: {
          followerId: req.user!.userId,
          creatorId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.userFollow.delete({ where: { id: existing.id } });

      // Track unfollow event
      await prisma.feedEvent.create({
        data: {
          userId: req.user!.userId,
          creatorId,
          event: 'skip', // unfollow is a signal to deprioritize
        },
      });

      return res.json({ followed: false });
    }

    // Follow
    await prisma.userFollow.create({
      data: {
        followerId: req.user!.userId,
        creatorId,
      },
    });

    // Track follow event
    await prisma.feedEvent.create({
      data: {
        userId: req.user!.userId,
        creatorId,
        event: 'follow',
      },
    });

    // Notify creator of new follower
    const [follower, creatorProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } }),
      prisma.creatorProfile.findUnique({ where: { id: creatorId }, select: { userId: true } }),
    ]);
    if (creatorProfile) {
      notifyNewFollower(creatorProfile.userId, follower?.displayName || 'Someone').catch(() => {});
    }

    res.json({ followed: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/feed/following — Check if user follows specific creators
feedRouter.get('/following', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const follows = await prisma.userFollow.findMany({
      where: { followerId: req.user!.userId },
      select: { creatorId: true },
    });

    res.json({ following: follows.map((f) => f.creatorId) });
  } catch (err) {
    next(err);
  }
});
