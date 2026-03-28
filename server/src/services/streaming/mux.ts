import Mux from '@mux/mux-node';
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

  const liveStream = await mux.video.liveStreams.create({
    playback_policy: ['public'],
    new_asset_settings: {
      playback_policy: ['public'],
    },
    latency_mode: latencyMode,
    reconnect_window: reconnectWindow,
  });

  const playbackId = liveStream.playback_ids?.[0]?.id || '';

  logger.info(`Mux live stream created: ${liveStream.id} for "${title}"`);

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
