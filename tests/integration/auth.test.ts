import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = 'http://localhost:3001';

// These tests require the server to be running
describe('Auth API Integration', () => {
  const testUser = {
    email: `test_${Date.now()}@dressme.com`,
    username: `testuser_${Date.now()}`,
    displayName: 'Test User',
    password: 'testpass123!',
  };
  let authToken: string;

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.username).toBe(testUser.username);
      expect(data.token).toBeTruthy();
      authToken = data.token;
    });

    it('rejects duplicate email', async () => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      expect(res.status).toBe(409);
    });

    it('rejects invalid email format', async () => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testUser, email: 'not-an-email', username: 'another' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: testUser.password }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBeTruthy();
      expect(data.user.email).toBe(testUser.email);
    });

    it('rejects invalid password', async () => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: 'wrongpassword' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user profile with valid token', async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.threadBalance).toBe(0);
    });

    it('rejects requests without token', async () => {
      const res = await fetch(`${API_URL}/api/auth/me`);
      expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(res.status).toBe(401);
    });
  });
});
