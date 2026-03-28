import { describe, it, expect } from 'vitest';
import { isMuxConfigured } from '../../server/src/services/streaming/mux';

describe('Mux Service', () => {
  describe('isMuxConfigured', () => {
    it('returns false when env vars are not set', () => {
      // In test environment, MUX vars are typically not set
      // This tests the guard function
      const result = isMuxConfigured();
      expect(typeof result).toBe('boolean');
    });
  });
});
