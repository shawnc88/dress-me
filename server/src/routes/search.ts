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
        // Anonymized deleted accounts keep their creator profile row — never
        // surface them as creators.
        where: { user: { username: { not: { startsWith: 'deleted_' } } } },
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
        username: { not: { startsWith: 'deleted_' } },
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

// GET /api/search/explore?category=coding — the Explore surface.
// Mixed discovery grid: live + upcoming streams first, then trending reels.
// Category matches the content's own category OR the creator's (legacy rows
// predate per-content categories and fall back to creator.category).
searchRouter.get('/explore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = (req.query.category as string || '').trim();

    // Reel.creatorId is a CreatorProfile id with NO Prisma relation — the
    // category fallback + creator enrichment go through the profile map,
    // matching the manual-join pattern used by / (plain search) above.
    const categoryProfileIds = category
      ? (await prisma.creatorProfile.findMany({ where: { category }, select: { id: true } })).map((c) => c.id)
      : [];

    const [streams, reels] = await Promise.all([
      prisma.stream.findMany({
        where: {
          status: { in: ['LIVE', 'SCHEDULED'] },
          ...(category ? { OR: [{ category }, { creator: { category } }] } : {}),
        },
        orderBy: [{ status: 'asc' }, { viewerCount: 'desc' }], // LIVE sorts before SCHEDULED
        take: 12,
        include: {
          creator: {
            select: { id: true, category: true, user: { select: { username: true, displayName: true, avatarUrl: true } } },
          },
        },
      }),
      prisma.reel.findMany({
        where: category
          ? { OR: [{ category }, { creatorId: { in: categoryProfileIds } }] }
          : {},
        orderBy: [{ viewsCount: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      }),
    ]);

    // Enrich reels with creator data (manual join — see note above)
    const reelCreatorIds = [...new Set(reels.map((r) => r.creatorId))];
    const reelCreators = await prisma.creatorProfile.findMany({
      where: { id: { in: reelCreatorIds } },
      include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
    const reelCreatorMap = new Map(reelCreators.map((c) => [c.id, c]));

    res.json({
      streams: streams.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        category: s.category || s.creator?.category || null,
        scheduledFor: s.scheduledFor,
        viewerCount: s.viewerCount,
        thumbnailUrl: s.thumbnailUrl,
        muxPlaybackId: s.muxPlaybackId,
        creator: {
          username: s.creator?.user?.username,
          displayName: s.creator?.user?.displayName,
          avatarUrl: s.creator?.user?.avatarUrl,
        },
      })),
      reels: reels.map((r) => {
        const c = reelCreatorMap.get(r.creatorId);
        return {
          id: r.id,
          thumbnailUrl: r.thumbnailUrl,
          muxPlaybackId: r.muxPlaybackId,
          caption: r.caption,
          category: r.category,
          viewsCount: r.viewsCount,
          likesCount: r.likesCount,
          creator: c ? { username: c.user?.username, displayName: c.user?.displayName } : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});
