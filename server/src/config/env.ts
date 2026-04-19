import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

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
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
