import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { createMuxLiveStream, completeMuxStream, disableMuxStream, getMuxStreamStatus, isMuxConfigured, isSigningConfigured, generatePlaybackToken, type LatencyMode } from '../services/streaming/mux';
import { logger } from '../utils/logger';

export const streamRouter = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  streamType: z.enum(['PUBLIC', 'PREMIUM', 'ELITE', 'PRIVATE']).default('PUBLIC'),
  scheduledFor: z.string().datetime().optional(),
  latencyMode: z.enum(['standard', 'reduced', 'low']).default('reduced'),
  reconnectWindow: z.number().min(0).max(1800).default(60),
  ingestMode: z.enum(['rtmp', 'browser']).default('rtmp'),
});

// List live/upcoming streams
streamRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'LIVE', limit = '20', offset = '0' } = req.query;

    // Auto-expire stale LIVE streams (older than 12 hours with no viewers)
    if (status === 'LIVE') {
      const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
      await prisma.stream.updateMany({
        where: {
          status: 'LIVE',
          startedAt: { lt: staleThreshold },
          viewerCount: 0,
        },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

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

    // Generate signed tokens if signing is configured
    let tokens: { video?: string; thumbnail?: string; storyboard?: string } | null = null;
    if (stream.muxPlaybackId && isSigningConfigured()) {
      tokens = {
        video: generatePlaybackToken(stream.muxPlaybackId, 'video') || undefined,
        thumbnail: generatePlaybackToken(stream.muxPlaybackId, 'thumbnail') || undefined,
        storyboard: generatePlaybackToken(stream.muxPlaybackId, 'storyboard') || undefined,
      };
    }

    res.json({ stream, playbackUrl, tokens });
  } catch (err) {
    next(err);
  }
});

// GET /api/streams/:id/status — Check live stream status (polls Mux)
streamRouter.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id },
      select: { muxStreamId: true, muxPlaybackId: true, status: true, ingestMode: true },
    });
    if (!stream) throw new AppError(404, 'Stream not found');

    let muxStatus: string | null = null;
    if (stream.muxStreamId && isMuxConfigured()) {
      try {
        const mux = await getMuxStreamStatus(stream.muxStreamId);
        muxStatus = mux.status; // 'idle' | 'active' | 'disabled'
      } catch {}
    }

    res.json({
      streamStatus: stream.status,
      muxStatus,
      playbackId: stream.muxPlaybackId,
      isPlayable: muxStatus === 'active',
    });
  } catch (err) {
    next(err);
  }
});

// Create stream with Mux RTMP ingest (creators only)
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

      if (!isMuxConfigured()) {
        throw new AppError(503, 'Mux is not configured — streaming unavailable');
      }

      // Create Mux live stream
      logger.info(`Creating Mux live stream for "${data.title}"`);
      const muxStream = await createMuxLiveStream(data.title, data.latencyMode as LatencyMode, data.reconnectWindow);
      logger.info(`Mux stream created: id=${muxStream.muxStreamId}, playbackId=${muxStream.playbackId}, hasKey=${!!muxStream.streamKey}`);

      const stream = await prisma.stream.create({
        data: {
          creatorId: creator.id,
          title: data.title,
          description: data.description,
          streamType: data.streamType as any,
          scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
          muxStreamId: muxStream.muxStreamId,
          muxPlaybackId: muxStream.playbackId,
          muxStreamKey: muxStream.streamKey,
          ingestMode: 'rtmp',
        },
      });

      res.status(201).json({
        stream,
        streamKey: muxStream.streamKey,
        rtmpUrl: muxStream.rtmpUrl,
        playbackId: muxStream.playbackId,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Go live — marks stream as STARTING, Mux webhook will set LIVE when RTMP connects
streamRouter.post(
  '/:id/live',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.stream.findUnique({
        where: { id: req.params.id },
        include: { creator: true },
      });
      if (!existing) throw new AppError(404, 'Stream not found');

      if (existing.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }

      logger.info(`Stream ${req.params.id}: go-live request`);

      // Mark as SCHEDULED (starting) — Mux webhook will transition to LIVE
      // when OBS/RTMP actually connects and sends video
      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: { status: 'SCHEDULED' },
      });

      logger.info(`Stream ${req.params.id}: set to SCHEDULED, waiting for RTMP ingest`);
      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);

// End stream
// mode=soft (default): complete Mux recording (adds EXT-X-ENDLIST) then disable
// End stream
streamRouter.post(
  '/:id/end',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.stream.findUnique({
        where: { id: req.params.id },
        include: { creator: true },
      });
      if (!existing) throw new AppError(404, 'Stream not found');

      if (existing.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }

      if (existing.status === 'ENDED' || existing.status === 'ARCHIVED') {
        return res.json({ stream: existing, alreadyEnded: true });
      }

      // End Mux stream: complete (adds EXT-X-ENDLIST) then disable
      if (existing.muxStreamId && isMuxConfigured()) {
        await completeMuxStream(existing.muxStreamId).catch(() => {});
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

      logger.info(`Stream ${req.params.id}: ended`);
      res.json({ stream });
    } catch (err) {
      next(err);
    }
  }
);
