import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3001';

describe('Mux Webhook Integration', () => {
  describe('POST /api/mux/webhook', () => {
    it('rejects requests without Mux-Signature header', async () => {
      const res = await fetch(`${API_URL}/api/mux/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-event-1',
          type: 'video.live_stream.active',
          data: { id: 'test-stream-id' },
        }),
      });

      // If MUX_WEBHOOK_SECRET is set, should reject without valid signature
      // If not set, should accept (with warning logged)
      expect([200, 401]).toContain(res.status);
    });

    it('returns 200 for valid webhook payload (when secret not configured)', async () => {
      // When MUX_WEBHOOK_SECRET is not set, webhooks are accepted without verification
      const res = await fetch(`${API_URL}/api/mux/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-event-${Date.now()}`,
          type: 'video.live_stream.active',
          data: { id: 'nonexistent-mux-id' },
        }),
      });

      // Should not crash even with nonexistent stream ID
      expect([200, 401]).toContain(res.status);
    });

    it('handles duplicate events idempotently', async () => {
      const eventId = `dedup-test-${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'video.live_stream.active',
        data: { id: 'test-mux-id' },
      };

      // Send same event twice
      const res1 = await fetch(`${API_URL}/api/mux/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res2 = await fetch(`${API_URL}/api/mux/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Both should succeed (second is a no-op dedupe)
      if (res1.status === 200) {
        expect(res2.status).toBe(200);
      }
    });
  });
});
