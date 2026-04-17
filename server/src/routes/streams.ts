import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { createMuxLiveStream, completeMuxStream, disableMuxStream, getMuxStreamStatus, isMuxConfigured, isSigningConfigured, generatePlaybackToken, type LatencyMode } from '../services/streaming/mux';
import { isLivekitConfigured, startRtmpEgress, verifyPublisherTracks, stopEgress, deleteRoom } from '../services/streaming/livekit';
import { getMoneyMoments } from '../services/moneyMoments';
import { logger } from '../utils/logger';

export const streamRouter = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  streamType: z.enum(['PUBLIC', 'PREMIUM', 'ELITE', 'PRIVATE']).default('PUBLIC'),
  scheduledFor: z.string().datetime().optional(),
  latencyMode: z.enum(['standard', 'reduced', 'low']).default('low'),
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
streamRouter.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
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

    // Check access for premium/elite/private streams
    const restrictedTypes = ['PREMIUM', 'ELITE', 'PRIVATE'];
    let hasAccess = true;

    if (restrictedTypes.includes(stream.streamType)) {
      hasAccess = false;

      if (req.user) {
        // Check if user has an active fan subscription to this creator
        const activeSub = await prisma.fanSubscription.findUnique({
          where: {
            userId_creatorId: {
              userId: req.user.userId,
              creatorId: stream.creatorId,
            },
          },
        });
        if (activeSub && activeSub.status === 'ACTIVE') {
          hasAccess = true;
        }

        // Creator always has access to their own stream
        if (stream.creator.userId === req.user.userId) {
          hasAccess = true;
        }

        // Admins have access
        if (req.user.role === 'ADMIN') {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      // Return stream metadata without playback info
      const { muxPlaybackId, muxStreamKey, ...safeStream } = stream;
      return res.json({ stream: safeStream, playbackUrl: null, tokens: null });
    }

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

// GET /api/streams/:id/diagnostics — Lightweight stream diagnostics
streamRouter.get('/:id/diagnostics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        muxStreamId: true,
        muxPlaybackId: true,
        ingestMode: true,
        livekitRoomName: true,
        livekitEgressId: true,
        startedAt: true,
        viewerCount: true,
        peakViewers: true,
      },
    });
    if (!stream) throw new AppError(404, 'Stream not found');

    let muxStatus: string | null = null;
    if (stream.muxStreamId && isMuxConfigured()) {
      try {
        const mux = await getMuxStreamStatus(stream.muxStreamId);
        muxStatus = mux.status;
      } catch {}
    }

    const uptimeSeconds = stream.startedAt
      ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
      : 0;

    res.json({
      streamId: stream.id,
      status: stream.status,
      muxStatus,
      ingestMode: stream.ingestMode,
      hasEgress: !!stream.livekitEgressId,
      hasRoom: !!stream.livekitRoomName,
      playbackId: stream.muxPlaybackId,
      uptimeSeconds,
      viewerCount: stream.viewerCount,
      peakViewers: stream.peakViewers,
      latencyMode: 'low',
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

      const sid = req.params.id;
      logger.info(`Stream ${sid}: go-live request (mode=${existing.ingestMode})`);

      // For browser mode with LiveKit: start RTMP egress to Mux
      // Client calls this AFTER tracks are confirmed published + audio detected
      let egressId: string | undefined;
      if (existing.muxStreamKey && isLivekitConfigured() && !existing.livekitEgressId) {
        try {
          // Verify room has BOTH audio and video tracks
          const trackInfo = await verifyPublisherTracks(sid);

          logger.info(`Stream ${sid}: pre-egress check`, {
            roomName: sid,
            publisherIdentity: trackInfo.publisherIdentity,
            hasAudio: trackInfo.hasAudio,
            hasVideo: trackInfo.hasVideo,
            trackCount: trackInfo.trackCount,
            rtmpUrl: 'rtmp://global-live.mux.com:5222/app',
            streamKeySuffix: existing.muxStreamKey.slice(-6),
          });

          if (!trackInfo.hasAudio || !trackInfo.hasVideo) {
            logger.error(`Stream ${sid}: missing tracks — audio=${trackInfo.hasAudio}, video=${trackInfo.hasVideo}`);
            return res.status(400).json({
              error: {
                message: `Cannot start stream: ${!trackInfo.hasAudio ? 'audio' : 'video'} track not published. Please check your mic/camera permissions.`,
              },
            });
          }

          logger.info(`Stream ${sid}: starting RTMP egress from LiveKit to Mux`);
          egressId = await startRtmpEgress(
            sid,
            'rtmp://global-live.mux.com:5222/app',
            existing.muxStreamKey,
          );
          logger.info(`Stream ${sid}: egress started successfully — ${egressId}`);
        } catch (err: any) {
          logger.error(`Stream ${sid}: EGRESS FAILED — ${err.message}`, { stack: err.stack });
          return res.status(500).json({
            error: { message: `Failed to start stream egress: ${err.message}` },
          });
        }
      }

      // Mark as SCHEDULED — Mux webhook transitions to LIVE when video arrives
      const stream = await prisma.stream.update({
        where: { id: sid },
        data: {
          status: 'SCHEDULED',
          livekitRoomName: egressId ? sid : undefined,
          ...(egressId ? { livekitEgressId: egressId } : {}),
        },
      });

      logger.info(`Stream ${sid}: set to SCHEDULED, egress=${egressId || 'none'}`);
      res.json({ stream, egressId });
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

      // Stop LiveKit egress and clean up room
      if (existing.livekitEgressId && isLivekitConfigured()) {
        await stopEgress(existing.livekitEgressId).catch(() => {});
      }
      if (existing.livekitRoomName && isLivekitConfigured()) {
        await deleteRoom(existing.livekitRoomName).catch(() => {});
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

// GET /api/streams/:id/money-moments — Live earning prompts for creator
streamRouter.get('/:id/money-moments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id },
      select: { creatorId: true, creator: { select: { userId: true } } },
    });
    if (!stream) throw new AppError(404, 'Stream not found');
    if (stream.creator.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new AppError(403, 'Only the creator can view money moments');
    }

    const moments = await getMoneyMoments(req.params.id);
    res.json({ moments });
  } catch (err) {
    next(err);
  }
});
