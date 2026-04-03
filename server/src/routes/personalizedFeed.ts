import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getPersonalizedFeed, updateUserPreferences } from '../services/feedRanking';

export const personalizedFeedRouter = Router();

// GET /api/feed/personalized — AI-ranked feed
personalizedFeedRouter.get('/personalized', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || null;
    const feed = await getPersonalizedFeed(userId);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

// POST /api/feed/event — Track content engagement signal
personalizedFeedRouter.post('/event', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.json({ ok: true }); // anonymous users don't get tracked

    const data = z.object({
      contentId: z.string(),
      contentType: z.enum(['stream', 'reel', 'story']),
      creatorId: z.string(),
      event: z.enum([
        'view', 'like', 'comment', 'share', 'follow', 'skip',
        'profile_open', 'tier_click', 'subscribe', 'replay',
      ]),
      watchTimeMs: z.number().int().min(0).max(3600000).optional(),
    }).parse(req.body);

    const updateFields: any = {};
    switch (data.event) {
      case 'view': updateFields.watchTimeMs = { increment: data.watchTimeMs || 1000 }; break;
      case 'like': updateFields.liked = true; break;
      case 'comment': updateFields.commented = true; break;
      case 'share': updateFields.shared = true; break;
      case 'follow': updateFields.followed = true; break;
      case 'skip': updateFields.skipped = true; break;
      case 'profile_open': updateFields.profileOpened = true; break;
      case 'tier_click': updateFields.tierClicked = true; break;
      case 'subscribe': updateFields.subscribed = true; break;
      case 'replay': updateFields.replayCount = { increment: 1 }; break;
    }

    await prisma.contentRankingSignal.upsert({
      where: { userId_contentId: { userId, contentId: data.contentId } },
      update: updateFields,
      create: {
        userId,
        contentId: data.contentId,
        contentType: data.contentType,
        creatorId: data.creatorId,
        ...(data.event === 'view' ? { watchTimeMs: data.watchTimeMs || 1000 } : {}),
        liked: data.event === 'like',
        commented: data.event === 'comment',
        shared: data.event === 'share',
        followed: data.event === 'follow',
        skipped: data.event === 'skip',
        profileOpened: data.event === 'profile_open',
        tierClicked: data.event === 'tier_click',
        subscribed: data.event === 'subscribe',
      },
    });

    // Update preferences periodically (every 10th event)
    const count = await prisma.contentRankingSignal.count({ where: { userId } });
    if (count % 10 === 0) {
      updateUserPreferences(userId).catch(() => {}); // fire and forget
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/feed/buckets — Content buckets for home page
personalizedFeedRouter.get('/buckets', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || null;
    const feed = await getPersonalizedFeed(userId);

    // Add story groups
    const now = new Date();
    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    const creatorIds = [...new Set(stories.map(s => s.creatorId))];
    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: creatorIds } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));
    const storyGroups = creatorIds.map(cid => ({
      creatorId: cid,
      user: creatorMap.get(cid)?.user,
      stories: stories.filter(s => s.creatorId === cid),
    })).filter(g => g.user);

    res.json({
      stories: storyGroups,
      ...feed,
    });
  } catch (err) {
    next(err);
  }
});
