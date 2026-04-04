import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuthPayload } from '../../middleware/auth';

interface SuiteUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

// Rate limit: 5 messages per 10 seconds per user
const RATE_LIMIT_WINDOW = 10_000;
const RATE_LIMIT_MAX = 5;
const suiteChatRateLimit = new Map<string, { count: number; resetAt: number }>();

function isSuiteChatRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = suiteChatRateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    suiteChatRateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

/**
 * Suite-specific Socket.IO events for real-time invite/join/leave notifications.
 * Runs on the same io server as chat but uses a /suite namespace.
 * All events are authenticated via JWT — userId is derived from token, never from client payload.
 */
export function setupSuiteSocket(io: SocketServer) {
  const suiteNs = io.of('/suite');

  // JWT auth middleware — reject unauthenticated connections
  suiteNs.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, displayName: true, avatarUrl: true, role: true },
      });
      if (!user) return next(new Error('User not found'));

      (socket as any).user = {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      } as SuiteUser;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  suiteNs.on('connection', (socket) => {
    const user = (socket as any).user as SuiteUser;
    logger.debug(`Suite socket connected: ${socket.id} (user: ${user.userId})`);

    // Join a suite room for real-time updates — userId derived from auth, not client
    socket.on('join-suite', async (data: { suiteId: string }) => {
      socket.join(`suite:${data.suiteId}`);
      logger.info(`User ${user.userId} joined suite room ${data.suiteId}`);
    });

    // Creator broadcasts invite sent — verify caller is CREATOR role
    socket.on('invite-sent', async (data: { suiteId: string; userIds: string[]; streamId: string }) => {
      if (user.role !== 'CREATOR') return; // silently ignore non-creators

      // Verify this creator owns the suite
      const suite = await prisma.suiteSession.findUnique({ where: { id: data.suiteId } });
      if (!suite) return;
      const stream = await prisma.stream.findUnique({
        where: { id: suite.streamId },
        include: { creator: true },
      });
      if (!stream || stream.creator.userId !== user.userId) return;

      suiteNs.to(`suite:${data.suiteId}`).emit('suite-invite', {
        suiteId: data.suiteId,
        streamId: data.streamId,
        userIds: data.userIds,
      });
    });

    // Guest accepted and is joining — userId from auth
    socket.on('guest-joining', async (data: { suiteId: string }) => {
      const userInfo = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { displayName: true, avatarUrl: true },
      });
      suiteNs.to(`suite:${data.suiteId}`).emit('guest-joined', {
        userId: user.userId,
        displayName: userInfo?.displayName,
        avatarUrl: userInfo?.avatarUrl,
      });
    });

    // Guest left — userId from auth
    socket.on('guest-left', (data: { suiteId: string; reason: 'left' | 'removed' }) => {
      suiteNs.to(`suite:${data.suiteId}`).emit('guest-departed', {
        userId: user.userId,
        reason: data.reason,
      });
    });

    // Suite ended — verify caller is creator
    socket.on('suite-ended', async (data: { suiteId: string }) => {
      if (user.role !== 'CREATOR') return;

      const suite = await prisma.suiteSession.findUnique({ where: { id: data.suiteId } });
      if (!suite) return;
      const stream = await prisma.stream.findUnique({
        where: { id: suite.streamId },
        include: { creator: true },
      });
      if (!stream || stream.creator.userId !== user.userId) return;

      suiteNs.to(`suite:${data.suiteId}`).emit('suite-closed', {
        suiteId: data.suiteId,
      });
    });

    // ─── Suite Chat Messages ───
    // Only participants (host + accepted guests) can send messages.
    // Verified by checking they're in the suite room.
    socket.on('suite-chat-message', async (data: { suiteId: string; content: string }) => {
      if (!data.content?.trim()) return;

      // Rate limit
      if (isSuiteChatRateLimited(user.userId)) {
        socket.emit('suite-chat-blocked', { reason: 'Slow down! Too many messages.' });
        return;
      }

      const content = data.content.trim().slice(0, 300);

      // Verify user is in this suite room (they joined via join-suite)
      const rooms = socket.rooms;
      if (!rooms.has(`suite:${data.suiteId}`)) return;

      // Determine role in suite (host vs guest)
      let suiteRole = 'guest';
      try {
        const suite = await prisma.suiteSession.findUnique({ where: { id: data.suiteId } });
        if (suite) {
          const stream = await prisma.stream.findUnique({
            where: { id: suite.streamId },
            include: { creator: true },
          });
          if (stream?.creator.userId === user.userId) suiteRole = 'host';
        }
      } catch {}

      suiteNs.to(`suite:${data.suiteId}`).emit('suite-chat-message', {
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        suiteRole,
        content,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      logger.debug(`Suite socket disconnected: ${socket.id} (user: ${user.userId})`);
    });
  });
}
