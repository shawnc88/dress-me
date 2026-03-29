import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { disableMuxStream, isMuxConfigured } from '../services/streaming/mux';
import { stopEgress, deleteRoom, isLivekitConfigured } from '../services/streaming/livekit';
import { logger } from '../utils/logger';

export const cleanupRouter = Router();

// Temporary endpoint to end all stuck LIVE streams
cleanupRouter.post('/end-all-streams', async (_req: Request, res: Response) => {
  try {
    const liveStreams = await prisma.stream.findMany({
      where: { status: 'LIVE' },
      include: { creator: true },
    });

    const results: Array<{ id: string; title: string; result: string }> = [];

    for (const stream of liveStreams) {
      try {
        // Stop LiveKit egress if browser mode
        if (stream.ingestMode === 'browser' && stream.livekitEgressId && isLivekitConfigured()) {
          await stopEgress(stream.livekitEgressId).catch(() => {});
          await deleteRoom(stream.livekitRoomName || stream.id).catch(() => {});
        }

        // Disable Mux stream
        if (stream.muxStreamId && isMuxConfigured()) {
          await disableMuxStream(stream.muxStreamId).catch(() => {});
        }

        // Update DB
        await prisma.stream.update({
          where: { id: stream.id },
          data: { status: 'ENDED', endedAt: new Date(), livekitEgressId: null },
        });

        // Mark creator as not live
        await prisma.creatorProfile.update({
          where: { id: stream.creatorId },
          data: { isLive: false },
        });

        results.push({ id: stream.id, title: stream.title, result: 'ended' });
      } catch (err: any) {
        results.push({ id: stream.id, title: stream.title, result: `error: ${err.message}` });
      }
    }

    logger.info(`Cleanup: ended ${results.length} streams`);
    res.json({ ended: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
