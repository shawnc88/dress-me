import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const giveawayRouter = Router();

const HIGH_VALUE_THRESHOLD_CENTS = 500000; // $5,000 - requires NY/FL registration

const createGiveawaySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  prizeDetails: z.string().min(1),
  prizeValueUsd: z.number().min(1), // in dollars
  amoeMethod: z.string().min(1), // free entry method description
  eligibility: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxEntries: z.number().min(1).optional(),
});

// List active giveaways
giveawayRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const giveaways = await prisma.giveaway.findMany({
      where: { status: 'ACTIVE' },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true } } },
        },
        _count: { select: { entries: true } },
      },
      orderBy: { endDate: 'asc' },
    });
    res.json({ giveaways });
  } catch (err) {
    next(err);
  }
});

// Get giveaway details + official rules
giveawayRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true } } },
        },
        _count: { select: { entries: true } },
      },
    });
    if (!giveaway) throw new AppError(404, 'Giveaway not found');

    // Build official rules response
    const officialRules = {
      title: giveaway.title,
      sponsor: giveaway.creator.user.displayName,
      eligibility: giveaway.eligibility,
      entryPeriod: { start: giveaway.startDate, end: giveaway.endDate },
      prizeDetails: giveaway.prizeDetails,
      prizeValue: `$${(giveaway.prizeValueUsd / 100).toFixed(2)}`,
      freeEntryMethod: giveaway.amoeMethod,
      maxEntries: giveaway.maxEntries,
      requiresStateRegistration: giveaway.requiresStateReg,
      disclaimer: 'NO PURCHASE NECESSARY TO ENTER OR WIN. A purchase does not improve your chances of winning.',
    };

    res.json({ giveaway, officialRules });
  } catch (err) {
    next(err);
  }
});

// Create giveaway (creators only)
giveawayRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createGiveawaySchema.parse(req.body);
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const prizeValueCents = Math.round(data.prizeValueUsd * 100);
      const requiresStateReg = prizeValueCents >= HIGH_VALUE_THRESHOLD_CENTS;

      const giveaway = await prisma.giveaway.create({
        data: {
          creatorId: creator.id,
          title: data.title,
          description: data.description,
          prizeDetails: data.prizeDetails,
          prizeValueUsd: prizeValueCents,
          rulesUrl: '', // generated after creation
          amoeMethod: data.amoeMethod,
          eligibility: data.eligibility,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          maxEntries: data.maxEntries,
          requiresStateReg,
          status: requiresStateReg ? 'DRAFT' : 'ACTIVE',
        },
      });

      // Set rules URL
      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { rulesUrl: `/api/giveaways/${giveaway.id}#rules` },
      });

      res.status(201).json({
        giveaway,
        warning: requiresStateReg
          ? 'Prize value exceeds $5,000. Registration and bonding required in NY and FL before activating.'
          : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Enter giveaway (free AMOE or via purchase)
giveawayRouter.post(
  '/:id/enter',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entryMethod } = z
        .object({ entryMethod: z.enum(['purchase', 'amoe']) })
        .parse(req.body);

      const giveaway = await prisma.giveaway.findUnique({ where: { id: req.params.id } });
      if (!giveaway || giveaway.status !== 'ACTIVE') {
        throw new AppError(400, 'Giveaway not available');
      }

      if (new Date() > giveaway.endDate) {
        throw new AppError(400, 'Giveaway has ended');
      }

      // Check max entries
      if (giveaway.maxEntries) {
        const count = await prisma.giveawayEntry.count({
          where: { giveawayId: giveaway.id },
        });
        if (count >= giveaway.maxEntries) {
          throw new AppError(400, 'Maximum entries reached');
        }
      }

      const entry = await prisma.giveawayEntry.create({
        data: {
          giveawayId: giveaway.id,
          userId: req.user!.userId,
          entryMethod,
        },
      });

      res.status(201).json({ entry });
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return next(new AppError(400, 'Already entered this giveaway'));
      }
      next(err);
    }
  }
);

// Select winner (creator only)
giveawayRouter.post(
  '/:id/draw',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const giveaway = await prisma.giveaway.findUnique({
        where: { id: req.params.id },
        include: { entries: true },
      });
      if (!giveaway) throw new AppError(404, 'Giveaway not found');
      if (giveaway.creatorId !== creator.id) throw new AppError(403, 'Not your giveaway');
      if (giveaway.entries.length === 0) throw new AppError(400, 'No entries');

      // Random selection
      const winnerEntry = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];

      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { winnerId: winnerEntry.userId, status: 'WINNER_SELECTED' },
      });

      res.json({ winnerId: winnerEntry.userId });
    } catch (err) {
      next(err);
    }
  }
);
