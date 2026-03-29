import Mux from '@mux/mux-node';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let muxClient: Mux | null = null;

function getMux(): Mux {
  if (!muxClient) {
    if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
      throw new Error('Mux credentials not configured');
    }
    muxClient = new Mux({
      tokenId: env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
    });
  }
  return muxClient;
}

export interface MuxLiveStream {
  muxStreamId: string;
  streamKey: string;
  rtmpUrl: string;
  playbackId: string;
  playbackUrl: string;
}

export type LatencyMode = 'standard' | 'reduced' | 'low';

/**
 * Create a new Mux live stream for a creator
 * - latency_mode: 'standard' | 'reduced' | 'low'
 * - reconnect_window: seconds to wait for reconnection (reduced/low default to 0, must be explicit)
 */
export async function createMuxLiveStream(
  title: string,
  latencyMode: LatencyMode = 'reduced',
  reconnectWindow = 60,
): Promise<MuxLiveStream> {
  const mux = getMux();
  const useSigned = isSigningConfigured();
  const policy = useSigned ? 'signed' : 'public';

  const liveStream = await mux.video.liveStreams.create({
    playback_policy: [policy as any],
    new_asset_settings: {
      playback_policy: [policy as any],
    },
    latency_mode: latencyMode,
    reconnect_window: reconnectWindow,
  });

  const playbackId = liveStream.playback_ids?.[0]?.id || '';

  logger.info(`Mux live stream created: ${liveStream.id} for "${title}" (policy: ${policy})`);

  return {
    muxStreamId: liveStream.id,
    streamKey: liveStream.stream_key || '',
    rtmpUrl: `rtmp://global-live.mux.com:5222/app`,
    playbackId,
    playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
  };
}

/**
 * Get the status of a Mux live stream
 */
export async function getMuxStreamStatus(muxStreamId: string) {
  const mux = getMux();
  const stream = await mux.video.liveStreams.retrieve(muxStreamId);

  return {
    status: stream.status, // 'idle' | 'active' | 'disabled'
    playbackId: stream.playback_ids?.[0]?.id || '',
    recentAssetIds: stream.recent_asset_ids || [],
  };
}

/**
 * Signal a Mux live stream is finished — adds EXT-X-ENDLIST to HLS manifest
 * so players know the stream is over. Does not reject new ingest (use disable for that).
 */
export async function completeMuxStream(muxStreamId: string) {
  const mux = getMux();
  await mux.video.liveStreams.complete(muxStreamId);
  logger.info(`Mux live stream completed: ${muxStreamId}`);
}

/**
 * Disable (end) a Mux live stream
 */
export async function disableMuxStream(muxStreamId: string) {
  const mux = getMux();
  await mux.video.liveStreams.disable(muxStreamId);
  logger.info(`Mux live stream disabled: ${muxStreamId}`);
}

/**
 * Re-enable a Mux live stream
 */
export async function enableMuxStream(muxStreamId: string) {
  const mux = getMux();
  await mux.video.liveStreams.enable(muxStreamId);
}

/**
 * Delete a Mux live stream
 */
export async function deleteMuxStream(muxStreamId: string) {
  const mux = getMux();
  await mux.video.liveStreams.delete(muxStreamId);
  logger.info(`Mux live stream deleted: ${muxStreamId}`);
}

/**
 * Check if Mux is configured
 */
export function isMuxConfigured(): boolean {
  return !!(env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET);
}

/**
 * Check if Mux signed playback is configured
 */
export function isSigningConfigured(): boolean {
  return !!(env.MUX_SIGNING_KEY_ID && env.MUX_SIGNING_KEY_SECRET);
}

/**
 * Generate a signed playback token for a Mux playback ID.
 * Returns null if signing is not configured (public playback fallback).
 */
export function generatePlaybackToken(
  playbackId: string,
  type: 'video' | 'thumbnail' | 'storyboard' = 'video',
  expirationSeconds = 7200, // 2 hours
): string | null {
  if (!isSigningConfigured()) return null;

  const keyId = env.MUX_SIGNING_KEY_ID!;
  // Mux signing key secret is base64-encoded; decode to get the RSA private key
  const keySecret = Buffer.from(env.MUX_SIGNING_KEY_SECRET!, 'base64');

  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      sub: playbackId,
      aud: type,
      exp: now + expirationSeconds,
      kid: keyId,
    },
    keySecret,
    { algorithm: 'RS256', keyid: keyId },
  );

  return token;
}
