import apn from '@parse/node-apn';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * APNs sender — real lock-screen push to iOS devices (PushDevice tokens
 * registered by the native app via /api/push/register-device).
 *
 * Env-gated and fully inert until configured, so it can deploy ahead of the
 * 1.1 binary. Required env on Render:
 *   APNS_KEY        — contents of the .p8 APNs auth key (BEGIN/END PRIVATE KEY)
 *   APNS_KEY_ID     — the key's 10-char id from developer.apple.com → Keys
 *   APNS_TEAM_ID    — 86CMXZP2MZ
 * Bundle id is fixed: me.bewithmeapp.app. Token auth works for both sandbox
 * and production; `production: true` targets the App Store environment.
 */
const APNS_KEY = process.env.APNS_KEY || '';
const APNS_KEY_ID = process.env.APNS_KEY_ID || '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || '';
const BUNDLE_ID = 'me.bewithmeapp.app';

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider | null {
  if (provider) return provider;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) return null;
  try {
    provider = new apn.Provider({
      token: {
        key: Buffer.from(APNS_KEY.replace(/\\n/g, '\n')),
        keyId: APNS_KEY_ID,
        teamId: APNS_TEAM_ID,
      },
      production: true,
    });
    logger.info('APNs provider configured — native iOS push enabled');
    return provider;
  } catch (err: any) {
    logger.error(`APNs provider init failed: ${err.message}`);
    return null;
  }
}

export async function sendApnsToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const p = getProvider();
  if (!p) return; // not configured yet — web push still covers browsers

  const devices = await prisma.pushDevice.findMany({
    where: { userId, platform: 'ios', isActive: true },
  });
  if (devices.length === 0) return;

  const note = new apn.Notification();
  note.alert = { title: payload.title, body: payload.body };
  note.sound = 'default';
  note.topic = BUNDLE_ID;
  note.payload = { url: payload.url || '/' };
  note.expiry = Math.floor(Date.now() / 1000) + 3600;

  try {
    const result = await p.send(note, devices.map((d) => d.pushToken));
    // Deactivate tokens Apple reports as dead (uninstalled / regenerated)
    for (const f of result.failed) {
      if (f.response?.reason === 'BadDeviceToken' || f.response?.reason === 'Unregistered') {
        await prisma.pushDevice.updateMany({
          where: { pushToken: f.device },
          data: { isActive: false },
        }).catch(() => {});
      }
    }
    if (result.sent.length > 0) {
      logger.debug(`APNs: ${result.sent.length}/${devices.length} delivered for user ${userId}`);
    }
  } catch (err: any) {
    logger.error(`APNs send failed: ${err.message}`);
  }
}
