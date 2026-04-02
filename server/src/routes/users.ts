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
          select: { id: true, category: true, isLive: true },
        },
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json({ user });
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
