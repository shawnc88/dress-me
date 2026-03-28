import { Router, Request, Response } from 'express';
import express from 'express';
import Mux from '@mux/mux-node';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const muxWebhookRouter = Router();

// IMPORTANT: raw body for signature verification — must NOT use express.json()
muxWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const secret = env.MUX_WEBHOOK_SECRET;

    // If no webhook secret configured, accept but log warning
    if (!secret) {
      logger.warn('MUX_WEBHOOK_SECRET not set — accepting webhook without verification');
      const event = JSON.parse(req.body.toString('utf8'));
      await processEvent(event);
      return res.status(200).json({ received: true });
    }

    try {
      const rawBody = req.body.toString('utf8');

      // Verify signature using Mux SDK
      // Requires raw unparsed body string + request headers + signing secret
      const mux = new Mux({
        tokenId: env.MUX_TOKEN_ID!,
        tokenSecret: env.MUX_TOKEN_SECRET!,
      });
      mux.webhooks.verifySignature(rawBody, req.headers as Record<string, string>, secret);

      const event = JSON.parse(rawBody);
      await processEvent(event);

      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error('Mux webhook verification failed:', err.message);
      return res.status(401).json({ error: err?.message ?? 'Invalid signature' });
    }
  }
);

async function processEvent(event: any) {
  const eventId = event.id;
  const eventType = event.type;

  if (!eventId || !eventType) {
    logger.warn('Mux webhook missing id or type');
    return;
  }

  // Idempotency: dedupe by event ID — Mux may deliver duplicates
  try {
    await prisma.muxWebhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: event,
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation = duplicate event
    if (err.code === 'P2002') {
      logger.debug(`Duplicate Mux webhook event: ${eventId}`);
      return;
    }
    throw err;
  }

  logger.info(`Mux webhook: ${eventType} (${eventId})`);

  const data = event.data;

  switch (eventType) {
    case 'video.live_stream.active': {
      // Broadcast has started — update stream status to LIVE
      const muxStreamId = data?.id;
      if (muxStreamId) {
        await prisma.stream.updateMany({
          where: { muxStreamId },
          data: {
            status: 'LIVE',
            startedAt: new Date(),
          },
        });
        logger.info(`Stream ${muxStreamId} is now ACTIVE (broadcasting)`);
      }
      break;
    }

    case 'video.live_stream.idle': {
      // Broadcast has stopped — update stream status to ENDED
      const muxStreamId = data?.id;
      if (muxStreamId) {
        await prisma.stream.updateMany({
          where: { muxStreamId, status: 'LIVE' },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
          },
        });

        // Mark creator as not live
        const stream = await prisma.stream.findFirst({
          where: { muxStreamId },
          include: { creator: true },
        });
        if (stream) {
          await prisma.creatorProfile.update({
            where: { id: stream.creatorId },
            data: { isLive: false },
          });
        }
        logger.info(`Stream ${muxStreamId} is now IDLE (broadcast ended)`);
      }
      break;
    }

    case 'video.asset.ready': {
      // Recording is ready — store replay URL
      const assetId = data?.id;
      const playbackId = data?.playback_ids?.[0]?.id;
      const liveStreamId = data?.live_stream_id;

      if (liveStreamId && playbackId) {
        await prisma.stream.updateMany({
          where: { muxStreamId: liveStreamId },
          data: {
            replayUrl: `https://stream.mux.com/${playbackId}.m3u8`,
            status: 'ARCHIVED',
          },
        });
        logger.info(`Asset ${assetId} ready for stream ${liveStreamId}, replay available`);
      }
      break;
    }

    default:
      logger.debug(`Unhandled Mux event: ${eventType}`);
  }
}
