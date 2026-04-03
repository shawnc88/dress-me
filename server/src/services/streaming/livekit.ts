import {
  AccessToken,
  EgressClient,
  EncodingOptionsPreset,
  RoomServiceClient,
  StreamOutput,
  StreamProtocol,
  type EgressInfo,
} from 'livekit-server-sdk';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────

function getLivekitHost(): string {
  // Convert wss:// to https:// for REST API calls
  const wsUrl = env.LIVEKIT_WS_URL!;
  return wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
}

function getRoomService(): RoomServiceClient {
  return new RoomServiceClient(
    getLivekitHost(),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}

function getEgressClient(): EgressClient {
  return new EgressClient(
    getLivekitHost(),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}

// ─── Public API ───────────────────────────────────────────────────

export function isLivekitConfigured(): boolean {
  return !!(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET && env.LIVEKIT_WS_URL);
}

/**
 * Generate a publisher access token for a creator joining a LiveKit room.
 */
export async function generatePublisherToken(
  roomName: string,
  identity: string,
  name: string,
): Promise<string> {
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: 6 * 60 * 60, // 6 hours
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: false, // publisher doesn't need to subscribe
  });

  const jwt = await token.toJwt();
  logger.info(`LiveKit token generated for room "${roomName}", identity "${identity}"`);
  return jwt;
}

/**
 * Create a LiveKit room (optional — rooms auto-create on first join,
 * but explicit creation lets us set options).
 */
export async function createRoom(roomName: string): Promise<void> {
  const svc = getRoomService();
  await svc.createRoom({
    name: roomName,
    emptyTimeout: 300, // 5 min grace after last participant leaves
    maxParticipants: 10, // publisher + egress compositor + headroom
  });
  logger.info(`LiveKit room created: ${roomName}`);
}

/**
 * Start RTMP egress from a LiveKit room to a Mux RTMP endpoint.
 * Returns the egress ID for later stop/cleanup.
 */
export async function startRtmpEgress(
  roomName: string,
  rtmpUrl: string,
  streamKey: string,
): Promise<string> {
  const egress = getEgressClient();
  const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

  const output: StreamOutput = new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls: [fullRtmpUrl],
  });

  const info: EgressInfo = await egress.startRoomCompositeEgress(
    roomName,
    output,
    'grid',                                // layout
    EncodingOptionsPreset.H264_720P_30,    // encoding preset (includes audio)
    false,                                 // audioOnly
    false,                                 // videoOnly
  );

  const egressId = info.egressId;
  logger.info(`LiveKit RTMP egress started: ${egressId} for room "${roomName}"`);
  return egressId;
}

/**
 * Stop a running egress.
 */
export async function stopEgress(egressId: string): Promise<void> {
  const egress = getEgressClient();
  await egress.stopEgress(egressId);
  logger.info(`LiveKit egress stopped: ${egressId}`);
}

/**
 * Delete a LiveKit room and disconnect all participants.
 */
export async function deleteRoom(roomName: string): Promise<void> {
  const svc = getRoomService();
  await svc.deleteRoom(roomName);
  logger.info(`LiveKit room deleted: ${roomName}`);
}

/**
 * Check if a room has active participants publishing tracks.
 */
export async function hasActivePublisher(roomName: string): Promise<boolean> {
  const svc = getRoomService();
  const participants = await svc.listParticipants(roomName);
  return participants.some((p) => p.tracks.length > 0);
}

/**
 * Wait for a publisher to have active tracks in the room, then return true.
 * Returns false if timeout reached (default 30 seconds).
 */
export async function waitForPublisher(roomName: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    try {
      const svc = getRoomService();
      const participants = await svc.listParticipants(roomName);
      const totalTracks = participants.reduce((sum, p) => sum + p.tracks.length, 0);
      logger.info(`Room "${roomName}" poll #${attempt}: ${participants.length} participants, ${totalTracks} tracks`);

      if (totalTracks > 0) {
        logger.info(`Room "${roomName}": publisher with ${totalTracks} tracks detected after ${attempt} polls`);
        return true;
      }
    } catch (err: any) {
      logger.debug(`Room "${roomName}" poll #${attempt} error: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  logger.warn(`Room "${roomName}": timed out waiting for publisher tracks after ${attempt} polls`);
  return false;
}
