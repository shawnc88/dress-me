import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Capacitor } from '@capacitor/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * useNativePush — registers the iOS device for real APNs push.
 *
 * On native iOS with a logged-in user: request permission → register with
 * APNs → POST the device token to /api/push/register-device (PushDevice).
 * The server's APNs sender then reaches this phone on the lock screen for
 * "creator went live" / DMs — even when the app is closed.
 *
 * Tapping a push routes to the in-app destination via the payload's `url`.
 * No-op on web and while logged out. Safe to call every app boot: the
 * server upserts by token.
 */
export function useNativePush() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (Capacitor.getPlatform() !== 'ios') return;
    const authToken = localStorage.getItem('token');
    if (!authToken) return;

    let removeListeners: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        const regHandle = await PushNotifications.addListener('registration', (t) => {
          fetch(`${API_URL}/api/push/register-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ platform: 'ios', pushToken: t.value, deviceName: 'iPhone' }),
          }).catch(() => {});
        });

        const tapHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = (action.notification?.data as any)?.url;
          if (typeof url === 'string' && url.startsWith('/')) router.push(url);
        });

        await PushNotifications.register();
        removeListeners = () => {
          regHandle.remove();
          tapHandle.remove();
        };
      } catch {
        // plugin missing (older binary) or permission dialog dismissed — fine
      }
    })();

    return () => removeListeners?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
