import { useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FeedEventType =
  | 'impression'
  | 'view_start'
  | 'view_3s'
  | 'view_30s'
  | 'like'
  | 'comment'
  | 'follow'
  | 'profile_open'
  | 'stream_join'
  | 'tier_click'
  | 'tier_subscribe'
  | 'skip'
  | 'return_view';

export function useFeedEvents() {
  const sentEvents = useRef(new Set<string>());

  const trackEvent = useCallback(
    async (
      creatorId: string,
      event: FeedEventType,
      meta?: Record<string, any>,
      streamId?: string,
    ) => {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Deduplicate impressions (only send once per creator per session)
      if (event === 'impression') {
        const key = `${creatorId}:impression`;
        if (sentEvents.current.has(key)) return;
        sentEvents.current.add(key);
      }

      try {
        await fetch(`${API_URL}/api/feed/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            creatorId,
            streamId: streamId || undefined,
            event,
            meta: meta || undefined,
          }),
        });
      } catch {
        // Fire and forget — don't block UI
      }
    },
    [],
  );

  const trackViewDuration = useCallback(
    (creatorId: string, streamId?: string) => {
      const start = Date.now();
      let sent3s = false;
      let sent30s = false;

      trackEvent(creatorId, 'view_start', undefined, streamId);

      const interval = setInterval(() => {
        const elapsed = Date.now() - start;

        if (!sent3s && elapsed >= 3000) {
          trackEvent(creatorId, 'view_3s', undefined, streamId);
          sent3s = true;
        }

        if (!sent30s && elapsed >= 30000) {
          trackEvent(creatorId, 'view_30s', undefined, streamId);
          sent30s = true;
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    },
    [trackEvent],
  );

  return { trackEvent, trackViewDuration };
}
