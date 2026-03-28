export interface ModerationResult {
  allowed: boolean;
  flags: ModerationFlag[];
  sanitized: string;
  confidence: number;
}

export type ModerationFlag = 'profanity' | 'spam' | 'scam' | 'pii' | 'harassment';

const PROFANITY_TERMS = new Set([
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'bastard', 'dick', 'cock',
  'pussy', 'cunt', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard',
  'kike', 'spic', 'chink', 'wetback',
]);

const SCAM_PHRASES = [
  'send money', 'wire transfer', 'click this link', 'free money',
  'congratulations you won', 'act now', 'limited time offer',
  'double your', 'guaranteed income', 'make money fast',
  'venmo me', 'cashapp me', 'send btc', 'crypto opportunity',
  'investment opportunity', 'dm me for', 'check my bio',
];

const HARASSMENT_PHRASES = [
  'kill yourself', 'kys', 'go die', 'neck yourself', 'end yourself',
  'you should die', 'hope you die', 'ugly af', 'fat ugly',
  'nobody loves you', 'worthless',
];

const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,     // SSN
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,      // Phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
];

function containsProfanity(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  return words.some((w) => PROFANITY_TERMS.has(w));
}

function isSpam(text: string): boolean {
  // Repeated characters: "hellooooooo"
  if (/(.)\1{5,}/.test(text)) return true;
  // Mostly caps (over 70% and longer than 10 chars)
  if (text.length > 10 && text.replace(/[^A-Z]/g, '').length / text.length > 0.7) return true;
  // Excessive URLs
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount >= 3) return true;
  // Repeated short message pattern
  const words = text.split(/\s+/);
  if (words.length > 4 && new Set(words).size <= 2) return true;
  return false;
}

function containsScam(text: string): boolean {
  const lower = text.toLowerCase();
  return SCAM_PHRASES.some((phrase) => lower.includes(phrase));
}

function containsHarassment(text: string): boolean {
  const lower = text.toLowerCase();
  return HARASSMENT_PHRASES.some((phrase) => lower.includes(phrase));
}

function containsPII(text: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitize(text: string): string {
  let result = text;
  // Replace profanity with asterisks
  const words = result.split(/\s+/);
  result = words
    .map((word) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      if (PROFANITY_TERMS.has(clean)) {
        return '*'.repeat(word.length);
      }
      return word;
    })
    .join(' ');
  // Redact PII
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '[redacted]');
  }
  return result;
}

export function moderateContent(text: string): ModerationResult {
  const flags: ModerationFlag[] = [];
  let confidence = 1.0;

  if (containsProfanity(text)) flags.push('profanity');
  if (isSpam(text)) flags.push('spam');
  if (containsScam(text)) flags.push('scam');
  if (containsHarassment(text)) flags.push('harassment');
  if (containsPII(text)) flags.push('pii');

  // Block on harassment/scam, allow (with sanitization) for profanity/pii
  const blocked = flags.includes('harassment') || flags.includes('scam') || flags.includes('spam');

  if (flags.length === 0) confidence = 0.95;
  else if (flags.length === 1) confidence = 0.85;
  else confidence = 0.75;

  return {
    allowed: !blocked,
    flags,
    sanitized: sanitize(text),
    confidence,
  };
}
