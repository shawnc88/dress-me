import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3001';

describe('Streams API Integration', () => {
  let creatorToken: string;

  beforeAll(async () => {
    // Login as the seeded creator
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bella@dressme.com', password: 'creator123!' }),
    });
    const data = await res.json();
    creatorToken = data.token;
  });

  describe('GET /api/streams', () => {
    it('lists live streams', async () => {
      const res = await fetch(`${API_URL}/api/streams?status=LIVE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.streams)).toBe(true);
    });

    it('lists scheduled streams', async () => {
      const res = await fetch(`${API_URL}/api/streams?status=SCHEDULED`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.streams)).toBe(true);
    });

    it('includes creator info in response', async () => {
      const res = await fetch(`${API_URL}/api/streams?status=LIVE`);
      const data = await res.json();
      if (data.streams.length > 0) {
        expect(data.streams[0].creator).toBeTruthy();
        expect(data.streams[0].creator.user.displayName).toBeTruthy();
      }
    });
  });

  describe('GET /api/streams/:id', () => {
    it('returns a single stream', async () => {
      // First get a stream ID
      const listRes = await fetch(`${API_URL}/api/streams?status=LIVE`);
      const listData = await listRes.json();

      if (listData.streams.length > 0) {
        const streamId = listData.streams[0].id;
        const res = await fetch(`${API_URL}/api/streams/${streamId}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.stream.id).toBe(streamId);
      }
    });

    it('returns 404 for non-existent stream', async () => {
      const res = await fetch(`${API_URL}/api/streams/nonexistent-id`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/streams', () => {
    it('creates a stream as creator', async () => {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({
          title: 'Test Stream',
          description: 'A test stream',
          streamType: 'PUBLIC',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.stream.title).toBe('Test Stream');
      expect(data.stream.status).toBe('SCHEDULED');
    });

    it('rejects unauthenticated stream creation', async () => {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Should Fail' }),
      });

      expect(res.status).toBe(401);
    });
  });
});
