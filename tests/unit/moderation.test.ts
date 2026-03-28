import { describe, it, expect } from 'vitest';
import { moderateContent } from '../../server/src/services/ai/moderation';

describe('Content Moderation', () => {
  describe('clean content', () => {
    it('allows normal messages', () => {
      const result = moderateContent('Love this outfit!');
      expect(result.allowed).toBe(true);
      expect(result.flags).toHaveLength(0);
    });

    it('allows fashion-related discussion', () => {
      const result = moderateContent('Can you show the accessories with that dress?');
      expect(result.allowed).toBe(true);
    });
  });

  describe('profanity detection', () => {
    it('detects profanity and sanitizes', () => {
      const result = moderateContent('That looks like shit');
      expect(result.flags).toContain('profanity');
      expect(result.sanitized).not.toContain('shit');
    });

    it('still allows messages with sanitized profanity', () => {
      const result = moderateContent('damn that looks good');
      expect(result.flags).toContain('profanity');
      expect(result.allowed).toBe(true); // profanity alone doesn't block
    });
  });

  describe('spam detection', () => {
    it('detects repeated characters', () => {
      const result = moderateContent('helloooooooooooo');
      expect(result.flags).toContain('spam');
      expect(result.allowed).toBe(false);
    });

    it('detects all-caps messages', () => {
      const result = moderateContent('BUY MY PRODUCT NOW ITS AMAZING');
      expect(result.flags).toContain('spam');
      expect(result.allowed).toBe(false);
    });

    it('detects excessive URLs', () => {
      const result = moderateContent('Check https://a.com https://b.com https://c.com');
      expect(result.flags).toContain('spam');
    });
  });

  describe('scam detection', () => {
    it('detects money scams', () => {
      const result = moderateContent('Send money to my account for free clothes');
      expect(result.flags).toContain('scam');
      expect(result.allowed).toBe(false);
    });

    it('detects crypto scams', () => {
      const result = moderateContent('Send btc to this address for double returns');
      expect(result.flags).toContain('scam');
      expect(result.allowed).toBe(false);
    });
  });

  describe('harassment detection', () => {
    it('blocks harassment', () => {
      const result = moderateContent('kys');
      expect(result.flags).toContain('harassment');
      expect(result.allowed).toBe(false);
    });
  });

  describe('PII detection', () => {
    it('detects and redacts phone numbers', () => {
      const result = moderateContent('Call me at 555-123-4567');
      expect(result.flags).toContain('pii');
      expect(result.sanitized).toContain('[redacted]');
      expect(result.sanitized).not.toContain('555-123-4567');
    });

    it('detects and redacts emails', () => {
      const result = moderateContent('Email me at user@example.com');
      expect(result.flags).toContain('pii');
      expect(result.sanitized).toContain('[redacted]');
    });

    it('detects SSN patterns', () => {
      const result = moderateContent('My SSN is 123-45-6789');
      expect(result.flags).toContain('pii');
    });
  });

  describe('confidence scoring', () => {
    it('returns high confidence for clean messages', () => {
      const result = moderateContent('Great stream!');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('returns lower confidence for flagged messages', () => {
      const result = moderateContent('damn that is ugly af');
      expect(result.confidence).toBeLessThan(0.9);
    });
  });
});
