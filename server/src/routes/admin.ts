import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRouter = Router();

// ─── One-time owner bootstrap ──────────────────────────────────────────────
// Promotes the platform owner to ADMIN while NO admin exists yet. Guards:
// (a) no-op once any ADMIN exists, (b) only the hardcoded owner email
// qualifies, (c) the owner's password still gates it via normal login.
const OWNER_EMAIL = 'stopresolutions1@gmail.com';
adminRouter.post('/bootstrap', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins > 0) return res.status(409).json({ error: 'An admin already exists' });
    const me = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!me || me.email.toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Not the platform owner' });
    }
    await prisma.user.update({ where: { id: me.id }, data: { role: 'ADMIN' } });
    res.json({ ok: true, role: 'ADMIN' });
  } catch (err) {
    next(err);
  }
});

// All admin routes require ADMIN or MODERATOR role
adminRouter.use(authenticate, requireRole('ADMIN', 'MODERATOR'));

// GET /api/admin/dashboard — Overview stats
adminRouter.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [userCount, creatorCount, streamCount, reportCount, pendingReports, liveStreams] = await Promise.all([
      prisma.user.count(),
      prisma.creatorProfile.count(),
      prisma.stream.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.stream.count({ where: { status: 'LIVE' } }),
    ]);

    res.json({
      stats: { userCount, creatorCount, streamCount, reportCount, pendingReports, liveStreams },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports — List reports with filters
adminRouter.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const reports = await prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Fetch reporter + target user info
    const userIds = new Set<string>();
    reports.forEach((r) => {
      userIds.add(r.reporterId);
      if (r.targetUserId) userIds.add(r.targetUserId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, username: true, displayName: true, role: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;

    res.json({
      reports: items.map((r) => ({
        ...r,
        reporter: userMap.get(r.reporterId) || null,
        targetUser: r.targetUserId ? userMap.get(r.targetUserId) || null : null,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reports/:id — Update report status
adminRouter.patch('/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({
      status: z.enum(['reviewed', 'resolved', 'dismissed']),
    }).parse(req.body);

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — List all users with search
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        threadBalance: true,
        createdAt: true,
        _count: { select: { posts: true, sentGifts: true, chatMessages: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;

    res.json({
      users: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/role — Change user role (promote/demote/suspend)
adminRouter.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = z.object({
      role: z.enum(['VIEWER', 'CREATOR', 'MODERATOR', 'ADMIN']),
    }).parse(req.body);

    // Only ADMIN can set ADMIN role
    if (role === 'ADMIN' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can promote to admin' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: role as any },
      select: { id: true, username: true, displayName: true, role: true },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id — Delete a user (admin only)
adminRouter.delete('/users/:id', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself via admin' });
    }

    await prisma.$transaction([
      prisma.postComment.deleteMany({ where: { userId } }),
      prisma.postLike.deleteMany({ where: { userId } }),
      prisma.post.deleteMany({ where: { userId } }),
      prisma.giveawayEntry.deleteMany({ where: { userId } }),
      prisma.raffleEntry.deleteMany({ where: { subscriberUserId: userId } }),
      prisma.raffleWinner.deleteMany({ where: { subscriberUserId: userId } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.gift.deleteMany({ where: { senderId: userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.feedEvent.deleteMany({ where: { userId } }),
      prisma.userFollow.deleteMany({ where: { followerId: userId } }),
      prisma.userFollow.deleteMany({ where: { creatorId: userId } }),
      prisma.userBlock.deleteMany({ where: { blockerId: userId } }),
      prisma.userBlock.deleteMany({ where: { blockedId: userId } }),
      prisma.report.deleteMany({ where: { reporterId: userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      prisma.creatorProfile.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/seed-channels — populate the platform with channel content ──
//
// Creates platform-owned "channel" creator accounts (clearly BWM-branded, not
// fake people) seeded with licensed free stock clips (Mixkit free license) so
// the feed and Explore read as alive from day one. Idempotent: reruns skip
// existing channels/reels. Real creator content gradually outranks these.
const SEED_CHANNELS: Array<{
  username: string; displayName: string; category: string; bio: string;
  reels: Array<{ url: string; caption: string; hashtags: string[] }>;
}> = [
  {
    username: 'bwm.music', displayName: 'BWM Music', category: 'music',
    bio: 'Live sessions, covers, and pure sound. The official music channel.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/424/424-1080.mp4', caption: 'Turn it up 🎶 Who should we feature next?', hashtags: ['music', 'live'] },
      { url: 'https://assets.mixkit.co/videos/42824/42824-1080.mp4', caption: 'Late night studio energy 🎧', hashtags: ['music', 'studio'] },
      { url: 'https://assets.mixkit.co/videos/33936/33936-720.mp4', caption: 'Feel the bass 🔊', hashtags: ['music'] },
    ],
  },
  {
    username: 'bwm.cooking', displayName: 'BWM Cooking', category: 'cooking',
    bio: 'Cook-alongs and kitchen live streams. Bring your appetite.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/3806/3806-1080.mp4', caption: 'Dinner ideas incoming 🍳 Go live from YOUR kitchen', hashtags: ['cooking', 'food'] },
      { url: 'https://assets.mixkit.co/videos/43063/43063-1080.mp4', caption: 'Fresh flavors only 🍅', hashtags: ['cooking'] },
      { url: 'https://assets.mixkit.co/videos/43922/43922-1080.mp4', caption: 'Chef moves 🔪✨', hashtags: ['cooking', 'chef'] },
    ],
  },
  {
    username: 'bwm.fitness', displayName: 'BWM Fitness', category: 'fitness',
    bio: 'Train with us live. Form checks, workouts, and daily motivation.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/23056/23056-720.mp4', caption: 'No excuses today 💪 Join a live workout', hashtags: ['fitness', 'workout'] },
      { url: 'https://assets.mixkit.co/videos/40248/40248-1080.mp4', caption: 'Push your limits 🏋️', hashtags: ['fitness'] },
    ],
  },
  {
    username: 'bwm.art', displayName: 'BWM Art', category: 'art',
    bio: 'Watch artists create in real time. Process over perfection.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/40310/40310-1080.mp4', caption: 'Every stroke tells a story 🎨', hashtags: ['art', 'painting'] },
      { url: 'https://assets.mixkit.co/videos/40322/40322-1080.mp4', caption: 'Live painting session — come watch the process', hashtags: ['art'] },
      { url: 'https://assets.mixkit.co/videos/41611/41611-1080.mp4', caption: 'Color therapy 🖌️', hashtags: ['art', 'creative'] },
    ],
  },
  {
    username: 'bwm.gaming', displayName: 'BWM Gaming', category: 'gaming',
    bio: 'Streams, clips, and clutch moments. Go live with your gameplay.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/43524/43524-1080.mp4', caption: 'Clutch or kick 🎮 Stream your runs live', hashtags: ['gaming'] },
      { url: 'https://assets.mixkit.co/videos/43527/43527-1080.mp4', caption: 'GG only 🕹️', hashtags: ['gaming', 'clips'] },
    ],
  },
  {
    username: 'bwm.dance', displayName: 'BWM Dance', category: 'chat',
    bio: 'Moves, vibes, and live dance sessions.',
    reels: [
      { url: 'https://assets.mixkit.co/videos/33899/33899-1080.mp4', caption: 'Catch this vibe 💃 Go live and show your moves', hashtags: ['dance', 'live'] },
      { url: 'https://assets.mixkit.co/videos/40369/40369-1080.mp4', caption: 'Feel the rhythm ✨', hashtags: ['dance'] },
    ],
  },
];

adminRouter.post('/seed-channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const results: Array<{ channel: string; created: boolean; reels: number }> = [];

    for (const ch of SEED_CHANNELS) {
      let user = await prisma.user.findUnique({ where: { username: ch.username } });
      let created = false;
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: ch.username,
            displayName: ch.displayName,
            email: `seed.${ch.username.replace(/\./g, '_')}@bewithme.live`,
            passwordHash: await bcrypt.hash(`Seed!${Math.random().toString(36).slice(2)}${Date.now()}`, 12),
            role: 'CREATOR',
            isVerified: true,
            bio: ch.bio,
          },
        });
        created = true;
      }

      let profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        profile = await prisma.creatorProfile.create({
          data: { userId: user.id, category: ch.category, isOnboarded: true },
        });
      }

      let reelCount = 0;
      for (const reel of ch.reels) {
        const existing = await prisma.reel.findFirst({
          where: { creatorId: profile.id, videoUrl: reel.url },
        });
        if (existing) continue;
        await prisma.reel.create({
          data: {
            creatorId: profile.id,
            videoUrl: reel.url,
            caption: reel.caption,
            category: ch.category,
            hashtags: reel.hashtags,
            viewsCount: 40 + Math.floor(Math.random() * 240),
            likesCount: 5 + Math.floor(Math.random() * 40),
          },
        });
        reelCount++;
      }
      results.push({ channel: ch.username, created, reels: reelCount });
    }

    res.json({ ok: true, results });
  } catch (err) {
    next(err);
  }
});
