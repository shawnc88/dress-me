import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { createMuxLiveStream, completeMuxStream, disableMuxStream, getMuxStreamStatus, isMuxConfigured, isSigningConfigured, generatePlaybackToken, type LatencyMode } from '../services/streaming/mux';
import { isLivekitConfigured, startRtmpEgress, stopEgress, deleteRoom, waitForPublisher } from '../services/streaming/livekit';
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

      // Create Mux live stream if configured (needed for both RTMP and browser modes)
      let muxData: { muxStreamId?: string; muxPlaybackId?: string; streamKey?: string; rtmpUrl?: string } = {};
      if (isMuxConfigured()) {
        logger.info(`Creating Mux live stream for "${data.title}" (mode: ${data.ingestMode})`);
        const muxStream = await createMuxLiveStream(data.title, data.latencyMode as LatencyMode, data.reconnectWindow);
        muxData = {
          muxStreamId: muxStream.muxStreamId,
          muxPlaybackId: muxStream.playbackId,
          streamKey: muxStream.streamKey,
          rtmpUrl: muxStream.rtmpUrl,
        };
        logger.info(`Mux stream created: id=${muxStream.muxStreamId}, playbackId=${muxStream.playbackId}, hasStreamKey=${!!muxStream.streamKey}`);
      } else {
        logger.warn('Mux is NOT configured — stream will have no video playback');
      }

      // For browser mode, validate LiveKit is configured
      if (data.ingestMode === 'browser' && !isLivekitConfigured()) {
        throw new AppError(503, 'LiveKit is not configured for browser streaming');
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
          muxStreamKey: data.ingestMode === 'browser' ? muxData.streamKey : undefined,
          ingestMode: data.ingestMode,
        },
      });

      if (data.ingestMode === 'browser') {
        // Browser mode: return stream info without RTMP credentials
        res.status(201).json({
          stream,
          ingestMode: 'browser',
          livekitRoomName: stream.id, // use stream ID as room name
        });
      } else {
        // RTMP mode: return stream key for OBS
        res.status(201).json({
          stream,
          streamKey: muxData.streamKey,
          rtmpUrl: muxData.rtmpUrl,
        });
      }
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
      const existing = await prisma.stream.findUnique({
        where: { id: req.params.id },
        include: { creator: true },
      });
      if (!existing) throw new AppError(404, 'Stream not found');

      // Verify stream belongs to this creator
      if (existing.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }

      // For browser mode, wait for tracks then start RTMP egress
      let egressId: string | undefined;
      let egressError: string | undefined;
      const streamId = req.params.id;
      logger.info(`Stream ${streamId}: go-live request (mode=${existing.ingestMode}, livekit=${isLivekitConfigured()}, mux=${isMuxConfigured()})`);

      if (existing.ingestMode === 'browser' && isLivekitConfigured() && isMuxConfigured()) {
        if (!existing.livekitEgressId) {
          if (!existing.muxStreamKey) {
            egressError = 'browser mode but no muxStreamKey';
            logger.error(`Stream ${streamId}: ${egressError}`);
          } else {
            try {
              // Wait for publisher to have tracks in the room
              logger.info(`Stream ${streamId}: waiting for publisher tracks in room...`);
              const hasPublisher = await waitForPublisher(streamId, 20000); // 20s timeout
              if (!hasPublisher) {
                logger.warn(`Stream ${streamId}: no publisher tracks detected after 20s, starting egress anyway`);
              }

              logger.info(`Stream ${streamId}: starting RTMP egress to Mux (key=${existing.muxStreamKey.slice(0, 8)}...)`);
              egressId = await startRtmpEgress(
                streamId,
                'rtmp://global-live.mux.com:5222/app',
                existing.muxStreamKey,
              );
              logger.info(`Stream ${streamId}: egress started with ID ${egressId}`);
            } catch (egressErr: any) {
              egressError = egressErr.message || 'Unknown egress error';
              logger.error(`Stream ${streamId}: egress FAILED — ${egressError}`);
            }
          }
        } else {
          logger.info(`Stream ${streamId}: egress already running (${existing.livekitEgressId})`);
        }
      }

      // For browser mode: stay SCHEDULED until Mux webhook confirms active
      // For RTMP mode: mark LIVE (creator already confirmed OBS is connected)
      const newStatus = existing.ingestMode === 'browser' ? 'SCHEDULED' : 'LIVE';

      const stream = await prisma.stream.update({
        where: { id: streamId },
        data: {
          status: newStatus as any,
          startedAt: existing.ingestMode === 'rtmp' ? new Date() : undefined,
          livekitRoomName: existing.ingestMode === 'browser' ? streamId : undefined,
          ...(egressId ? { livekitEgressId: egressId } : {}),
        },
      });

      // Only mark creator live for RTMP (browser waits for webhook)
      if (existing.ingestMode === 'rtmp') {
        await prisma.creatorProfile.update({
          where: { userId: req.user!.userId },
          data: { isLive: true },
        });
      }

      logger.info(`Stream ${streamId}: set to ${newStatus}, egressStarted=${!!egressId}`);
      res.json({ stream, egressStarted: !!egressId, egressId, egressError, status: newStatus });
    } catch (err) {
      next(err);
    }
  }
);

// End stream
// mode=soft (default): complete Mux recording (adds EXT-X-ENDLIST) then disable
// mode=hard: disable immediately (rejects any reconnect attempt)
streamRouter.post(
  '/:id/end',
  authenticate,
  requireRole('CREATOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode = 'soft' } = req.body ?? {};

      const existing = await prisma.stream.findUnique({
        where: { id: req.params.id },
        include: { creator: true },
      });
      if (!existing) throw new AppError(404, 'Stream not found');

      // Verify stream belongs to this creator
      if (existing.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }

      // Already ended — idempotent
      if (existing.status === 'ENDED' || existing.status === 'ARCHIVED') {
        return res.json({ stream: existing, alreadyEnded: true });
      }

      // Stop LiveKit egress if browser mode
      let stoppedEgress = false;
      if (existing.ingestMode === 'browser' && existing.livekitEgressId && isLivekitConfigured()) {
        await stopEgress(existing.livekitEgressId).catch(() => {});
        await deleteRoom(existing.livekitRoomName || req.params.id).catch(() => {});
        stoppedEgress = true;
      }

      // End Mux stream: complete first (adds EXT-X-ENDLIST), then disable
      let muxCompleted = false;
      if (existing.muxStreamId && isMuxConfigured()) {
        if (mode !== 'hard') {
          await completeMuxStream(existing.muxStreamId).catch(() => {});
          muxCompleted = true;
        }
        await disableMuxStream(existing.muxStreamId).catch(() => {});
      }

      const stream = await prisma.stream.update({
        where: { id: req.params.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          livekitEgressId: null,
        },
      });

      await prisma.creatorProfile.update({
        where: { userId: req.user!.userId },
        data: { isLive: false },
      });

      res.json({ stream, stoppedEgress, muxCompleted });
    } catch (err) {
      next(err);
    }
  }
);
