import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { generatePublisherToken, isLivekitConfigured } from '../services/streaming/livekit';

export const livekitRouter = Router();

const tokenSchema = z.object({
  streamId: z.string().min(1),
});

// Generate a LiveKit publisher token for a browser-mode stream
livekitRouter.post(
  '/token',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isLivekitConfigured()) {
        throw new AppError(503, 'LiveKit is not configured');
      }

      const { streamId } = tokenSchema.parse(req.body);

      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
        include: { creator: true },
      });

      if (!stream) throw new AppError(404, 'Stream not found');
      if (stream.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }
      if (stream.ingestMode !== 'browser') {
        throw new AppError(400, 'Stream is not in browser ingest mode');
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      const token = await generatePublisherToken(
        stream.livekitRoomName || streamId,
        req.user!.userId,
        user?.displayName || 'Creator',
      );

      res.json({
        token,
        wsUrl: env.LIVEKIT_WS_URL,
      });
    } catch (err) {
      next(err);
    }
  },
);
