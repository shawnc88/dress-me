import { useCallback } from 'react';
import { apiFetch } from '@/utils/api';

type EngagementEvent = 'like' | 'comment' | 'gift_sent' | 'follow_creator' | 'share_stream' | 'tier_click' | 'tier_subscribe';

export function useEngagement(streamId: string | undefined) {
  const trackEvent = useCallback(async (type: EngagementEvent, value?: number) => {
    if (!streamId) return;
    try {
      await apiFetch(`/api/engagement/${streamId}/event`, {
        method: 'POST',
        body: JSON.stringify({ type, value }),
      });
    } catch {}
  }, [streamId]);

  return { trackEvent };
}
