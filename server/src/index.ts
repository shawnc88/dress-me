import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
import { setupChatSocket } from './services/streaming/chat';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// CORS origins (support multiple for prod + dev)
const allowedOrigins = [env.CLIENT_URL, 'https://dressmeapp.me', 'https://www.dressmeapp.me', 'https://client-gold-two-81.vercel.app', 'http://localhost:3000'].filter(Boolean);

// Socket.IO for real-time chat
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Mux webhook — MUST be registered BEFORE express.json() (needs raw body)
app.use('/api/mux/webhook', muxWebhookRouter);

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

// API Routes
app.use('/api/auth', authRouter);
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
app.use('/api/feed', personalizedFeedRouter);
app.use('/api/push', smartPushRouter);
app.use('/api/creators', creatorGrowthRouter);

// Error handler (must be last)
app.use(errorHandler);

// Socket.IO chat
setupChatSocket(io);

// Start server
httpServer.listen(env.PORT, () => {
  logger.info(`Dress Me API running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

export { app, httpServer, io };
