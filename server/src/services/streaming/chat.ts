import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuthPayload } from '../../middleware/auth';
import { moderateContent } from '../ai/moderation';

interface ChatUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

// Rate limit: max messages per user per window
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 messages per 10 seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// Clean up stale rate limit entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// Cache subscription badges per user for 60s to avoid DB spam
const badgeCache = new Map<string, { badge: string | null; expiresAt: number }>();

async function getSubscriptionBadge(userId: string, streamCreatorId?: string): Promise<string | null> {
  const cacheKey = `${userId}:${streamCreatorId || 'any'}`;
  const cached = badgeCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.badge;

  let badge: string | null = null;

  try {
    // Check if user has an active subscription to the stream's creator
    if (streamCreatorId) {
      const sub = await prisma.fanSubscription.findFirst({
        where: { userId, creatorId: streamCreatorId, status: 'ACTIVE' },
        include: { tier: { select: { name: true } } },
      });

      if (sub) {
        switch (sub.tier.name) {
          case 'INNER_CIRCLE': badge = 'INNER_CIRCLE'; break;
          case 'VIP': badge = 'VIP'; break;
          case 'SUPPORTER': badge = 'SUPPORTER'; break;
        }
      }
    }
  } catch {}

  badgeCache.set(cacheKey, { badge, expiresAt: Date.now() + 60_000 });
  return badge;
}

export function setupChatSocket(io: SocketServer) {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      });
      if (!user) return next(new Error('User not found'));

      (socket as any).user = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      } satisfies ChatUser;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as ChatUser;
    // Track which stream this socket is in (for badge lookup)
    let currentStreamCreatorId: string | null = null;

    logger.debug(`Chat connected: ${user.username}`);

    // Join a stream's chat room
    socket.on('join-stream', async (streamId: string) => {
      socket.join(`stream:${streamId}`);

      // Look up stream creator for badge resolution
      try {
        const stream = await prisma.stream.findUnique({
          where: { id: streamId },
          select: { creatorId: true },
        });
        currentStreamCreatorId = stream?.creatorId || null;
      } catch {}

      // Increment viewer count
      await prisma.stream.update({
        where: { id: streamId },
        data: { viewerCount: { increment: 1 } },
      }).catch(() => {});

      // Get badge for the joining user
      const badge = await getSubscriptionBadge(user.userId, currentStreamCreatorId || undefined);

      socket.to(`stream:${streamId}`).emit('viewer-joined', {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        badge,
      });
    });

    // Send chat message
    socket.on('chat-message', async (data: { streamId: string; content: string }) => {
      if (!data.content?.trim()) return;

      // Rate limit check
      if (isRateLimited(user.userId)) {
        socket.emit('message-blocked', {
          reason: 'Slow down! You\'re sending messages too fast.',
        });
        return;
      }

      const moderation = moderateContent(data.content.trim().slice(0, 500));

      if (!moderation.allowed) {
        socket.emit('message-blocked', {
          reason: moderation.flags.join(', '),
        });
        return;
      }

      const message = await prisma.chatMessage.create({
        data: {
          streamId: data.streamId,
          userId: user.userId,
          content: moderation.sanitized,
        },
      });

      // Get subscription badge
      const badge = await getSubscriptionBadge(user.userId, currentStreamCreatorId || undefined);

      io.to(`stream:${data.streamId}`).emit('new-message', {
        id: message.id,
        type: 'text',
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        badge, // VIP, SUPPORTER, INNER_CIRCLE, or null
        content: moderation.sanitized,
        timestamp: message.createdAt,
      });
    });

    // Gift notification (sent after API processes the gift)
    socket.on('gift-sent', (data: { streamId: string; giftType: string; threads: number; message?: string }) => {
      io.to(`stream:${data.streamId}`).emit('gift-received', {
        type: 'gift',
        sender: user.displayName,
        senderUsername: user.username,
        senderAvatar: user.avatarUrl,
        giftType: data.giftType,
        threads: data.threads,
        message: data.message,
      });
    });

    // Poll vote
    socket.on('poll-vote', async (data: { streamId: string; pollId: string; optionId: string }) => {
      io.to(`stream:${data.streamId}`).emit('poll-updated', {
        pollId: data.pollId,
        optionId: data.optionId,
        voter: user.displayName,
      });
    });

    // Leave stream
    socket.on('leave-stream', async (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      currentStreamCreatorId = null;
      await prisma.stream.update({
        where: { id: streamId },
        data: { viewerCount: { decrement: 1 } },
      }).catch(() => {});
    });

    socket.on('disconnect', () => {
      logger.debug(`Chat disconnected: ${user.username}`);
    });
  });
}
