import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const notificationRouter = Router();

// GET /api/notifications — List notifications for current user
notificationRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit = '20' } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 50);

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;

    res.json({
      notifications: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count — Unread count badge
notificationRouter.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — Mark single notification as read
notificationRouter.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read-all — Mark all as read
notificationRouter.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — Delete a notification
notificationRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/vapid-key — Public VAPID key for push subscription
notificationRouter.get('/vapid-key', (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    logger.warn('VAPID_PUBLIC_KEY not set — push subscriptions will fail');
  }
  res.json({ publicKey });
});

// POST /api/notifications/push-subscribe — Save push subscription
notificationRouter.post('/push-subscribe', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    }).parse(req.body);

    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { userId: req.user!.userId, p256dh: data.keys.p256dh, auth: data.keys.auth },
      create: {
        userId: req.user!.userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/push-unsubscribe — Remove push subscription
notificationRouter.post('/push-unsubscribe', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.userId },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
