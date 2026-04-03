import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const smartPushRouter = Router();

// POST /api/push/register-device — Register push device
smartPushRouter.post('/register-device', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      platform: z.enum(['web', 'ios', 'android']),
      pushToken: z.string().min(1),
      deviceName: z.string().optional(),
    }).parse(req.body);

    await prisma.pushDevice.upsert({
      where: { pushToken: data.pushToken },
      update: { userId: req.user!.userId, isActive: true, deviceName: data.deviceName },
      create: {
        userId: req.user!.userId,
        platform: data.platform,
        pushToken: data.pushToken,
        deviceName: data.deviceName,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/push/preferences — Get notification preferences
smartPushRouter.get('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: req.user!.userId },
      });
    }

    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/preferences — Update notification preferences
smartPushRouter.post('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      creatorLive: z.boolean().optional(),
      creatorReel: z.boolean().optional(),
      creatorStory: z.boolean().optional(),
      likes: z.boolean().optional(),
      comments: z.boolean().optional(),
      follows: z.boolean().optional(),
      gifts: z.boolean().optional(),
      mentions: z.boolean().optional(),
      streakReminder: z.boolean().optional(),
      comebackAlert: z.boolean().optional(),
      quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
      quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
    }).parse(req.body);

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.userId },
      update: data,
      create: { userId: req.user!.userId, ...data },
    });

    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/opened — Track notification open
smartPushRouter.post('/opened', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deliveryId } = z.object({ deliveryId: z.string() }).parse(req.body);

    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { openedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
