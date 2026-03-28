import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/error';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      throw new AppError(409, 'Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName,
      },
      select: { id: true, email: true, username: true, displayName: true, role: true },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        threadBalance: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
