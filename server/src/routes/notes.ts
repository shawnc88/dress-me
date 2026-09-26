import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const noteRouter = Router();

// ─── Notes — the 60-char presence signal above the DM inbox ─────────
// "going live at 9 🔥" costs a creator nothing and fills tonight's room.
// One active note per user; 24h expiry; shown to followers.

const noteSchema = z.object({ text: z.string().trim().min(1).max(60) });

// POST /api/notes — set (replace) my note
noteRouter.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = noteSchema.parse(req.body ?? {});
    const userId = req.user!.userId;
    await prisma.note.deleteMany({ where: { userId } });
    const note = await prisma.note.create({
      data: { userId, text, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/mine — clear my note
noteRouter.delete('/mine', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.note.deleteMany({ where: { userId: req.user!.userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/notes — my note + active notes from creators I follow
noteRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Followed creators → their USER ids (notes belong to users)
    const follows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { creatorId: true },
    });
    const creatorProfiles = follows.length
      ? await prisma.creatorProfile.findMany({
          where: { id: { in: follows.map(f => f.creatorId) } },
          select: { userId: true },
        })
      : [];
    const followedUserIds = creatorProfiles.map(c => c.userId);

    const notes = await prisma.note.findMany({
      where: {
        expiresAt: { gt: new Date() },
        userId: { in: [...followedUserIds, userId] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(notes.map(n => n.userId))] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      notes: notes
        .filter(n => userMap.has(n.userId))
        .map(n => ({
          id: n.id,
          text: n.text,
          createdAt: n.createdAt,
          mine: n.userId === userId,
          user: userMap.get(n.userId),
        }))
        // Own note first, then newest
        .sort((a, b) => (a.mine === b.mine ? 0 : a.mine ? -1 : 1)),
    });
  } catch (err) {
    next(err);
  }
});
