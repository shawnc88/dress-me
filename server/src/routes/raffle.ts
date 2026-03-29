import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const raffleRouter = Router();

const createRaffleSchema = z.object({
  title: z.string().min(1).max(100),
  closesAt: z.string().datetime(),
  maxWinners: z.number().int().min(1).max(100),
  tierWeights: z.record(z.number().int().min(1)).optional(),
  streamId: z.string().optional(),
});

const drawRaffleSchema = z.object({
  raffleId: z.string(),
});

// Create a raffle
raffleRouter.post(
  '/create',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createRaffleSchema.parse(req.body);

      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const raffle = await prisma.raffle.create({
        data: {
          creatorId: creator.id,
          streamId: data.streamId,
          title: data.title,
          closesAt: new Date(data.closesAt),
          maxWinners: data.maxWinners,
          tierWeights: data.tierWeights ?? {},
        },
      });

      res.status(201).json({
        raffleId: raffle.id,
        status: raffle.status,
        closesAt: raffle.closesAt,
        maxWinners: raffle.maxWinners,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Draw winners — idempotent (returns same winners if already drawn)
raffleRouter.post(
  '/draw',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { raffleId } = drawRaffleSchema.parse(req.body);

      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      // Use a transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        const raffle = await tx.raffle.findUnique({
          where: { id: raffleId },
          include: { winners: { orderBy: { rank: 'asc' } } },
        });
        if (!raffle) throw new AppError(404, 'Raffle not found');
        if (raffle.creatorId !== creator.id) throw new AppError(403, 'Not your raffle');

        // Idempotent: return existing winners if already drawn
        if (raffle.status === 'DRAWN') {
          return {
            raffleId: raffle.id,
            status: 'DRAWN' as const,
            winners: raffle.winners.map((w) => ({
              userId: w.subscriberUserId,
              tier: w.tier,
              rank: w.rank,
            })),
          };
        }

        if (raffle.status === 'CANCELLED') {
          throw new AppError(400, 'Raffle is cancelled');
        }

        // Get eligible subscribers: active subscriptions for this creator's viewers
        // The Subscription model is per-user (platform-wide tier), so we use it as entitlements
        const subs = await tx.subscription.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { currentPeriodEnd: null },
              { currentPeriodEnd: { gt: new Date() } },
            ],
          },
          select: { userId: true, tier: true },
        });

        if (subs.length === 0) {
          throw new AppError(400, 'No eligible subscribers to draw from');
        }

        const tierWeights = (raffle.tierWeights ?? {}) as Record<string, number>;

        // Build candidate pool with ticket weights
        const candidates = subs.map((s) => ({
          userId: s.userId,
          tier: s.tier,
          tickets: Math.max(1, Number(tierWeights[s.tier] ?? 1)),
        }));

        // Snapshot entries
        for (const c of candidates) {
          await tx.raffleEntry.upsert({
            where: {
              raffleId_subscriberUserId: {
                raffleId,
                subscriberUserId: c.userId,
              },
            },
            create: {
              raffleId,
              subscriberUserId: c.userId,
              tier: c.tier,
              tickets: c.tickets,
            },
            update: {
              tier: c.tier,
              tickets: c.tickets,
            },
          });
        }

        // Weighted draw without replacement
        const seed = crypto.randomBytes(16).toString('hex');
        let pool = candidates.slice();
        const winners: Array<{ userId: string; tier: string; rank: number }> = [];

        for (let rank = 1; rank <= raffle.maxWinners && pool.length > 0; rank++) {
          const total = pool.reduce((a, c) => a + c.tickets, 0);
          const pick = crypto.randomInt(0, total);
          let cursor = 0;
          let idx = 0;
          for (; idx < pool.length; idx++) {
            cursor += pool[idx].tickets;
            if (pick < cursor) break;
          }
          const chosen = pool[idx];
          winners.push({ userId: chosen.userId, tier: chosen.tier, rank });
          pool.splice(idx, 1);
        }

        // Persist winners
        for (const w of winners) {
          await tx.raffleWinner.create({
            data: {
              raffleId,
              subscriberUserId: w.userId,
              tier: w.tier,
              rank: w.rank,
            },
          });
        }

        // Mark raffle as drawn
        await tx.raffle.update({
          where: { id: raffleId },
          data: {
            status: 'DRAWN',
            drawnAt: new Date(),
            drawSeed: seed,
          },
        });

        return { raffleId, status: 'DRAWN' as const, winners };
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get raffle details
raffleRouter.get(
  '/:id',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      const raffle = await prisma.raffle.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { entries: true } },
          winners: {
            orderBy: { rank: 'asc' },
            include: {
              subscriber: {
                select: { username: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
      });

      if (!raffle) throw new AppError(404, 'Raffle not found');
      if (raffle.creatorId !== creator.id) throw new AppError(403, 'Not your raffle');

      res.json({
        raffle: {
          id: raffle.id,
          title: raffle.title,
          status: raffle.status,
          closesAt: raffle.closesAt,
          maxWinners: raffle.maxWinners,
          tierWeights: raffle.tierWeights,
          drawnAt: raffle.drawnAt,
          createdAt: raffle.createdAt,
        },
        entryCount: raffle._count.entries,
        winners: raffle.winners.map((w) => ({
          userId: w.subscriberUserId,
          username: w.subscriber.username,
          displayName: w.subscriber.displayName,
          avatarUrl: w.subscriber.avatarUrl,
          tier: w.tier,
          rank: w.rank,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);
