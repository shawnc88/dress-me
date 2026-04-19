import './instrument';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { prisma } from './utils/prisma';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { streamRouter } from './routes/streams';
import { subscriptionRouter } from './routes/subscriptions';
import { threadRouter } from './routes/threads';
import { giveawayRouter } from './routes/giveaways';
import { creatorRouter } from './routes/creators';
import { recommendationRouter } from './routes/recommendations';
import { muxWebhookRouter } from './routes/muxWebhook';
import { livekitRouter } from './routes/livekit';
import { raffleRouter } from './routes/raffle';
import { postRouter } from './routes/posts';
import { feedRouter } from './routes/feed';
import { moderationRouter } from './routes/moderation';
import { viralRouter } from './routes/viral';
import { notificationRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { engagementRouter } from './routes/engagement';
import { growthRouter } from './routes/growth';
import { storyRouter } from './routes/stories';
import { reelRouter } from './routes/reels';
import { searchRouter } from './routes/search';
import { personalizedFeedRouter } from './routes/personalizedFeed';
import { smartPushRouter } from './routes/smartPush';
import { creatorGrowthRouter } from './routes/creatorGrowth';
import { messageRouter } from './routes/messages';
import { creatorTierRouter } from './routes/creatorTiers';
import { fanSubscriptionRouter } from './routes/fanSubscriptions';
import { suiteRouter } from './routes/suite';
import { monetizationRouter } from './routes/monetization';
import { playbookRouter } from './routes/playbook';
import { setupChatSocket } from './services/streaming/chat';
import { setupSuiteSocket } from './services/suite/suiteSocket';
import { startSubscriptionExpiryJob } from './services/subscriptionExpiry';
import { sendPlaybookReminders } from './services/smartPush';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// CORS origins (support multiple for prod + dev)
const allowedOrigins = [env.CLIENT_URL, 'https://bewithme.live', 'https://www.bewithme.live', 'https://dressmeapp.me', 'https://www.dressmeapp.me', 'https://client-gold-two-81.vercel.app', 'http://localhost:3000'].filter(Boolean);

// Socket.IO for real-time chat
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Trust proxy for correct client IP behind reverse proxies (Render, etc.)
app.set('trust proxy', 1);

// Webhooks — MUST be registered BEFORE express.json() (need raw body)
app.use('/api/mux/webhook', muxWebhookRouter);
app.use('/api/threads/webhook', express.raw({ type: 'application/json' }), threadRouter);
app.use('/api/fan-subscriptions/webhook', express.raw({ type: 'application/json' }), fanSubscriptionRouter);

// Middleware
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (both paths for compatibility) — verifies DB connectivity
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});
app.get('/healthz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Strict rate limiter on auth routes
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Too many attempts, try again later' },
});

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', userRouter);
app.use('/api/streams', streamRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/threads', threadRouter);
app.use('/api/giveaways', giveawayRouter);
app.use('/api/creators', creatorRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/livekit', livekitRouter);
app.use('/api/raffle', raffleRouter);
app.use('/api/posts', postRouter);
app.use('/api/feed', feedRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/viral', viralRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/engagement', engagementRouter);
app.use('/api/growth', growthRouter);
app.use('/api/stories', storyRouter);
app.use('/api/reels', reelRouter);
app.use('/api/search', searchRouter);
app.use('/api/feed/personalized', personalizedFeedRouter);
app.use('/api/push', smartPushRouter);
app.use('/api/creators/growth', creatorGrowthRouter);
app.use('/api/messages', messageRouter);
app.use('/api/creator-tiers', creatorTierRouter);
app.use('/api/monetization', monetizationRouter);
app.use('/api/creators/playbook', playbookRouter);

// Rate-limited subscription endpoints
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many checkout attempts. Please try again in a minute.' } },
});
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Webhook rate limit exceeded' } },
});
app.use('/api/fan-subscriptions/checkout', checkoutLimiter);
app.use('/api/fan-subscriptions/webhook', webhookLimiter);
app.use('/api/fan-subscriptions', fanSubscriptionRouter);

app.use('/api/suite', suiteRouter);

// Sentry error handler must come before any custom error middleware
Sentry.setupExpressErrorHandler(app);

// Error handler (must be last)
app.use(errorHandler);

// Socket.IO chat + suite events
setupChatSocket(io);
setupSuiteSocket(io);

// Start server
httpServer.listen(env.PORT, () => {
  logger.info(`Be With Me API running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);

  // Start background jobs
  startSubscriptionExpiryJob();

  // Playbook reminders — run daily at 10am UTC (Mon/Wed/Fri only)
  const PLAYBOOK_INTERVAL_MS = 60 * 60 * 1000; // check every hour
  setInterval(() => {
    const hour = new Date().getUTCHours();
    if (hour === 10) sendPlaybookReminders().catch(() => {});
  }, PLAYBOOK_INTERVAL_MS);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  io.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, httpServer, io };
