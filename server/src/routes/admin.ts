import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRouter = Router();

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
