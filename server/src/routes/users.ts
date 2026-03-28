import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const userRouter = Router();

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
    const { displayName, bio, avatarUrl } = req.body;
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
    const { displayName, bio, avatarUrl } = req.body;
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
