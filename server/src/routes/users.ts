import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import multer from 'multer';

export const userRouter = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only JPEG, PNG, and WebP images are allowed') as any);
    }
  },
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().max(5000000).optional().nullable(), // Allow base64 data URLs
});

// POST /api/users/avatar — Upload profile picture
userRouter.post(
  '/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'Image is required');
      }

      const base64 = req.file.buffer.toString('base64');
      const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { avatarUrl },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          role: true,
          threadBalance: true,
          createdAt: true,
          email: true,
        },
      });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

userRouter.get('/profile/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        creatorProfile: {
          select: { id: true, category: true, isLive: true, totalEarnings: true },
        },
      },
    });
    if (!user) throw new AppError(404, 'User not found');

    const isCreator = user.role === 'CREATOR' || user.role === 'ADMIN';
    const creatorId = user.creatorProfile?.id;

    // Fetch counts in parallel
    const [followerCount, reels, posts, liveStream, totalLikes] = await Promise.all([
      creatorId
        ? prisma.userFollow.count({ where: { creatorId } })
        : 0,
      creatorId
        ? prisma.reel.findMany({
            where: { creatorId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: { id: true, muxPlaybackId: true, thumbnailUrl: true, viewsCount: true, likesCount: true, caption: true },
          })
        : [],
      prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, imageUrl: true, caption: true },
      }),
      creatorId
        ? prisma.stream.findFirst({
            where: { creatorId, status: 'LIVE' },
            select: { id: true, title: true, viewerCount: true },
          })
        : null,
      creatorId
        ? prisma.reel.aggregate({ where: { creatorId }, _sum: { likesCount: true } })
        : { _sum: { likesCount: 0 } },
    ]);

    res.json({
      user: {
        ...user,
        isCreator,
        followerCount,
        totalLikes: totalLikes._sum.likesCount || 0,
        reelCount: (reels as any[]).length,
        earnings: isCreator ? (user.creatorProfile?.totalEarnings || 0) / 100 : 0,
      },
      reels,
      posts,
      liveStream,
    });
  } catch (err) {
    next(err);
  }
});

userRouter.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatarUrl } = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName, bio, avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        threadBalance: true,
        createdAt: true,
        email: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

userRouter.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatarUrl } = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName, bio, avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
