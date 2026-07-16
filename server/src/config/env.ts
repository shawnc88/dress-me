import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// A paste error in the Render dashboard shipped STRIPE_SECRET_KEY as the whole
// "STRIPE_SECRET_KEY=sk_live_…" line with stray whitespace. Newlines in the value
// make Node reject Stripe's Authorization header, surfacing as an opaque
// "connection to Stripe" error — so sanitize pasted secrets at the boundary.
const pastedSecret = (name: string) =>
  z
    .string()
    .optional()
    .transform((raw) => {
      if (!raw) return undefined;
      let value = raw.trim();
      if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim();
      if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1).trim();
      if (value !== raw) {
        console.warn(`[env] ${name} contained stray characters — sanitized in code; fix the raw value in the Render dashboard`);
      }
      return value || undefined;
    });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Stripe (optional until configured)
  STRIPE_SECRET_KEY: pastedSecret('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: pastedSecret('STRIPE_WEBHOOK_SECRET'),

  // Streaming
  RTMP_SERVER_URL: z.string().default('rtmp://localhost:1935/live'),
  CDN_URL: z.string().optional(),

  // Mux Video Streaming
  MUX_TOKEN_ID: z.string().optional(),
  MUX_TOKEN_SECRET: z.string().optional(),
  MUX_WEBHOOK_SECRET: z.string().optional(),
  MUX_SIGNING_KEY_ID: z.string().optional(),
  MUX_SIGNING_KEY_SECRET: z.string().optional(),

  // LiveKit (WebRTC browser streaming)
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_WS_URL: z.string().optional(),

  // AI Services
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Push Notifications (VAPID)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@bewithme.live'),

  // App
  CLIENT_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  // Email (Resend). Without RESEND_API_KEY, emails log to console (dev mode).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Be With Me <noreply@bewithme.live>'),
  // Where user reports/blocks are sent for developer review (App Store Guideline 1.2).
  MODERATION_ALERT_EMAIL: z.string().default('safety@bewithme.live'),

  // iOS bundle ID — when set, Apple IAP webhook rejects transactions from
  // other apps as a defense against cross-app transaction replay.
  IOS_BUNDLE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
