import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { createMuxLiveStream, disableMuxStream, isMuxConfigured } from '../services/streaming/mux';

export const streamRouter = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  streamType: z.enum(['PUBLIC', 'PREMIUM', 'ELITE', 'PRIVATE']).default('PUBLIC'),
  scheduledFor: z.string().datetime().optional(),
});

// List live/upcoming streams
streamRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'LIVE', limit = '20', offset = '0' } = req.query;

    const streams = await prisma.stream.findMany({
      where: { status: status as any },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: { viewerCount: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({ streams });
  } catch (err) {
    next(err);
  }
});

// Get single stream (includes playback URL for viewers)
streamRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
        polls: { where: { isActive: true } },
      },
    });
    if (!stream) throw new AppError(404, 'Stream not found');

    // Build playback URL from Mux playback ID
    const playbackUrl = stream.muxPlaybackId
      ? `https://stream.mux.com/${stream.muxPlaybackId}.m3u8`
      : null;

    res.json({ stream, playbackUrl });
  } catch (err) {
    next(err);
  }
});

// Create stream with Mux live stream (creators only)
streamRouter.post(
  '/',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createStreamSchema.parse(req.body);
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!creator) throw new AppError(403, 'Creator profile required');

      // Create Mux live stream if configured
      let muxData: { muxStreamId?: string; muxPlaybackId?: string; streamKey?: string; rtmpUrl?: string } = {};
      if (isMuxConfigured()) {
        const muxStream = await createMuxLiveStream(data.title);
        muxData = {
          muxStreamId: muxStream.muxStreamId,
          muxPlaybackId: muxStream.playbackId,
          streamKey: muxStream.streamKey,
          rtmpUrl: muxStream.rtmpUrl,
        };
      }

      const stream = await prisma.stream.create({
        data: {
          creatorId: creator.id,
          title: data.title,
          description: data.description,
          streamType: data.streamType as any,
          scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
          muxStreamId: muxData.muxStreamId,
          muxPlaybackId: muxData.muxPlaybackId,
        },
      });

      res.status(201).json({
        stream,
        // Only show stream key to the creator who owns it
        streamKey: muxData.streamKey,
        rtmpUrl: muxData.rtmpUrl,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Go live
streamRouter.post(
  '/:id/live',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: { status: 'LIVE', startedAt: new Date() },
      });

      // Mark creator as live
      await prisma.creatorProfile.update({
        where: { userId: req.user!.userId },
        data: { isLive: true },
      });

      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);

// End stream
streamRouter.post(
  '/:id/end',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.stream.findUnique({ where: { id: req.params.id } });

      // Disable Mux stream if it exists
      if (existing?.muxStreamId && isMuxConfigured()) {
        await disableMuxStream(existing.muxStreamId).catch(() => {});
      }

      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      await prisma.creatorProfile.update({
        where: { userId: req.user!.userId },
        data: { isLive: false },
      });

      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);
