import { useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type MonetizationEventType =
  | 'coin_package_view'
  | 'coin_package_click'
  | 'coin_purchase_success'
  | 'gift_prompt_shown'
  | 'gift_prompt_clicked'
  | 'gift_prompt_dismissed'
  | 'low_balance_prompt_shown'
  | 'vip_prompt_shown'
  | 'vip_prompt_clicked'
  | 'vip_prompt_dismissed'
  | 'vip_upgrade_clicked'
  | 'leaderboard_view'
  | 'gift_callout_seen'
  | 'tier_comparison_view'
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_clicked'
  | 'upgrade_prompt_dismissed'
  | 'scarcity_badge_seen';

/** Fire-and-forget monetization event tracking. Dedupes by event+key within session. */
export function useMonetizationEvents() {
  const sent = useRef(new Set<string>());
  const queue = useRef<Array<{ event: string; meta?: Record<string, any> }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || queue.current.length === 0) return;

    const batch = queue.current.splice(0, 20);
    fetch(`${API_URL}/api/monetization/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
    }).catch(() => {});
  }, []);

  const track = useCallback(
    (event: MonetizationEventType, meta?: Record<string, any>, dedupeKey?: string) => {
      if (!localStorage.getItem('token')) return;

      // Dedupe within session
      const key = dedupeKey || `${event}:${meta?.packageId || meta?.triggerId || meta?.creatorId || ''}`;
      if (sent.current.has(key)) return;
      sent.current.add(key);

      queue.current.push({ event, meta });

      // Micro-batch: flush after 500ms of quiet
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 500);
    },
    [flush],
  );

  return { track };
}
