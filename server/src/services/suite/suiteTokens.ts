import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export type SuiteRole = 'host' | 'selected_guest' | 'audience';

/**
 * Generate a LiveKit token for Suite participation.
 * Permissions vary by role:
 * - host: publish + subscribe + data
 * - selected_guest: publish + subscribe + data
 * - audience: subscribe only (no publish)
 */
export async function generateSuiteToken(
  roomName: string,
  identity: string,
  displayName: string,
  role: SuiteRole,
): Promise<string> {
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    name: displayName,
    ttl: 4 * 60 * 60, // 4 hours
    metadata: JSON.stringify({ role }),
  });

  switch (role) {
    case 'host':
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      });
      break;

    case 'selected_guest':
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      });
      break;

    case 'audience':
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      });
      break;
  }

  const jwt = await token.toJwt();
  logger.info(`Suite token generated: room="${roomName}", identity="${identity}", role="${role}"`);
  return jwt;
}
