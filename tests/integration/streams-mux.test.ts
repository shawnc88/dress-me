import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3001';

describe('Streams + Mux Integration', () => {
  let creatorToken: string;

  beforeAll(async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bella@dressme.com', password: 'creator123!' }),
    });
    const data = await res.json();
    creatorToken = data.token;
  });

  describe('POST /api/streams (with Mux)', () => {
    it('creates a stream with Mux live stream when Mux is configured', async () => {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({
          title: 'QA Test Stream',
          description: 'Automated test',
          latencyMode: 'reduced',
          reconnectWindow: 60,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.stream.title).toBe('QA Test Stream');

      // If Mux is configured, these should be present
      if (data.stream.muxStreamId) {
        expect(data.streamKey).toBeTruthy();
        expect(data.rtmpUrl).toContain('rtmp://');
        expect(data.stream.muxPlaybackId).toBeTruthy();
      }
    });

    it('accepts latencyMode parameter', async () => {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({
          title: 'Low Latency Test',
          latencyMode: 'low',
          reconnectWindow: 30,
        }),
      });

      expect(res.status).toBe(201);
    });

    it('rejects invalid latencyMode', async () => {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({
          title: 'Invalid Latency',
          latencyMode: 'ultra-fast',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/streams/:id (playback URL)', () => {
    it('returns playbackUrl for streams with Mux playback ID', async () => {
      // Get a stream with muxPlaybackId
      const listRes = await fetch(`${API_URL}/api/streams?status=SCHEDULED`);
      const listData = await listRes.json();

      const muxStream = listData.streams?.find((s: any) => s.muxPlaybackId);
      if (muxStream) {
        const res = await fetch(`${API_URL}/api/streams/${muxStream.id}`);
        const data = await res.json();
        expect(data.playbackUrl).toContain('stream.mux.com');
        expect(data.playbackUrl).toContain('.m3u8');
      }
    });

    it('returns null playbackUrl for streams without Mux', async () => {
      const listRes = await fetch(`${API_URL}/api/streams?status=LIVE`);
      const listData = await listRes.json();

      const noMuxStream = listData.streams?.find((s: any) => !s.muxPlaybackId);
      if (noMuxStream) {
        const res = await fetch(`${API_URL}/api/streams/${noMuxStream.id}`);
        const data = await res.json();
        expect(data.playbackUrl).toBeNull();
      }
    });
  });

  describe('GET /healthz', () => {
    it('returns 200 with ok status', async () => {
      const res = await fetch(`${API_URL}/healthz`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
    });
  });
});
