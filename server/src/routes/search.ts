import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const searchRouter = Router();

// GET /api/search?q=... — Search users, reels, hashtags
searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      // Return trending data when no query
      const trendingReels = await prisma.reel.findMany({
        take: 12,
        orderBy: { viewsCount: 'desc' },
        where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      });

      const topCreators = await prisma.creatorProfile.findMany({
        take: 10,
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { totalEarnings: 'desc' },
      });

      // Get trending hashtags from recent reels
      const recentReels = await prisma.reel.findMany({
        take: 200,
        orderBy: { createdAt: 'desc' },
        select: { hashtags: true },
      });
      const tagCounts = new Map<string, number>();
      for (const r of recentReels) {
        for (const tag of r.hashtags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
      const trendingTags = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

      return res.json({
        users: topCreators.map(c => c.user),
        reels: trendingReels,
        tags: trendingTags,
      });
    }

    const searchTerm = `%${q}%`;
    const isHashtag = q.startsWith('#');
    const cleanTag = q.replace(/^#/, '').toLowerCase();

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      take: 10,
    });

    // Search reels by caption or hashtags
    const reels = await prisma.reel.findMany({
      where: isHashtag
        ? { hashtags: { has: cleanTag } }
        : {
            OR: [
              { caption: { contains: q, mode: 'insensitive' } },
              { hashtags: { has: cleanTag } },
            ],
          },
      orderBy: { viewsCount: 'desc' },
      take: 20,
    });

    // Enrich reels with creator data
    const creatorIds = [...new Set(reels.map(r => r.creatorId))];
    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: creatorIds } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));
    const enrichedReels = reels.map(r => ({
      ...r,
      creator: creatorMap.get(r.creatorId)?.user || null,
    }));

    // Find matching tags
    const matchingReels = await prisma.reel.findMany({
      take: 200,
      select: { hashtags: true },
      where: { hashtags: { isEmpty: false } },
    });
    const tagMatches = new Map<string, number>();
    for (const r of matchingReels) {
      for (const tag of r.hashtags) {
        if (tag.includes(cleanTag)) {
          tagMatches.set(tag, (tagMatches.get(tag) || 0) + 1);
        }
      }
    }
    const tags = [...tagMatches.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ users, reels: enrichedReels, tags });
  } catch (err) {
    next(err);
  }
});
