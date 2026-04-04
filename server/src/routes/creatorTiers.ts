import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';

export const creatorTierRouter = Router();

// Default tier templates creators can use
const DEFAULT_TIERS = {
  SUPPORTER: {
    priceCents: 499,
    description: 'Support your favorite creator',
    benefits: [
      'Subscriber-only posts, reels & stories',
      'Priority notifications when creator goes live',
      'Supporter badge in chat',
    ],
  },
  VIP: {
    priceCents: 1499,
    description: 'VIP access and Suite priority',
    benefits: [
      'All Supporter benefits',
      'Access to VIP-only live sessions',
      'Priority for Suite Selection',
      'Priority replies & recognition',
      'VIP chat badge',
    ],
  },
  INNER_CIRCLE: {
    priceCents: 2999,
    description: 'The ultimate fan experience',
    benefits: [
      'All VIP benefits',
      'Highest priority for Suite Selection',
      'Limited-capacity exclusive tier',
      'Exclusive drops & private sessions',
      'Inner Circle elite badge',
    ],
    slotLimit: 50,
  },
};

// GET /api/creator-tiers/:creatorId — Get a creator's tiers (public)
creatorTierRouter.get(
  '/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tiers = await prisma.creatorTier.findMany({
        where: { creatorId: req.params.creatorId, active: true },
        orderBy: { sortOrder: 'asc' },
      });

      // Also get subscriber counts per tier
      const counts = await prisma.fanSubscription.groupBy({
        by: ['tierId'],
        where: {
          creatorId: req.params.creatorId,
          status: 'ACTIVE',
        },
        _count: true,
      });

      const countMap = Object.fromEntries(counts.map(c => [c.tierId, c._count]));

      res.json({
        tiers: tiers.map(t => ({
          ...t,
          subscriberCount: countMap[t.id] || 0,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/creator-tiers — Initialize default tiers for a creator
creatorTierRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(404, 'Creator profile not found');

      // Check if tiers already exist
      const existing = await prisma.creatorTier.findMany({
        where: { creatorId: creator.id },
      });
      if (existing.length > 0) {
        throw new AppError(400, 'Tiers already initialized. Use PUT to update.');
      }

      const tiers = await prisma.$transaction([
        prisma.creatorTier.create({
          data: {
            creatorId: creator.id,
            name: 'SUPPORTER',
            priceCents: DEFAULT_TIERS.SUPPORTER.priceCents,
            description: DEFAULT_TIERS.SUPPORTER.description,
            benefits: DEFAULT_TIERS.SUPPORTER.benefits,
            sortOrder: 1,
          },
        }),
        prisma.creatorTier.create({
          data: {
            creatorId: creator.id,
            name: 'VIP',
            priceCents: DEFAULT_TIERS.VIP.priceCents,
            description: DEFAULT_TIERS.VIP.description,
            benefits: DEFAULT_TIERS.VIP.benefits,
            sortOrder: 2,
          },
        }),
        prisma.creatorTier.create({
          data: {
            creatorId: creator.id,
            name: 'INNER_CIRCLE',
            priceCents: DEFAULT_TIERS.INNER_CIRCLE.priceCents,
            description: DEFAULT_TIERS.INNER_CIRCLE.description,
            benefits: DEFAULT_TIERS.INNER_CIRCLE.benefits,
            slotLimit: DEFAULT_TIERS.INNER_CIRCLE.slotLimit,
            sortOrder: 3,
          },
        }),
      ]);

      logger.info(`Creator tiers initialized for creator ${creator.id}`);
      res.status(201).json({ tiers });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/creator-tiers/:tierId — Update a tier (creator only)
creatorTierRouter.put(
  '/:tierId',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        priceCents: z.number().min(99).max(99999).optional(),
        description: z.string().max(500).optional(),
        benefits: z.array(z.string().max(200)).max(10).optional(),
        active: z.boolean().optional(),
        slotLimit: z.number().min(1).max(10000).nullable().optional(),
      });
      const data = schema.parse(req.body);

      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(404, 'Creator profile not found');

      const tier = await prisma.creatorTier.findUnique({
        where: { id: req.params.tierId },
      });
      if (!tier || tier.creatorId !== creator.id) {
        throw new AppError(404, 'Tier not found');
      }

      const updated = await prisma.creatorTier.update({
        where: { id: req.params.tierId },
        data,
      });

      res.json({ tier: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/creator-tiers/me/all — Get own tiers with stats (creator dashboard)
creatorTierRouter.get(
  '/me/all',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(404, 'Creator profile not found');

      const tiers = await prisma.creatorTier.findMany({
        where: { creatorId: creator.id },
        orderBy: { sortOrder: 'asc' },
      });

      const subs = await prisma.fanSubscription.groupBy({
        by: ['tierId', 'status'],
        where: { creatorId: creator.id },
        _count: true,
      });

      // Calculate MRR
      let mrr = 0;
      const tierStats = tiers.map(t => {
        const active = subs
          .filter(s => s.tierId === t.id && s.status === 'ACTIVE')
          .reduce((sum, s) => sum + s._count, 0);
        const canceled = subs
          .filter(s => s.tierId === t.id && s.status === 'CANCELED')
          .reduce((sum, s) => sum + s._count, 0);
        mrr += active * t.priceCents;
        return { ...t, activeSubscribers: active, canceledSubscribers: canceled };
      });

      res.json({ tiers: tierStats, mrr });
    } catch (err) {
      next(err);
    }
  }
);
