import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuthPayload } from '../../middleware/auth';

interface SuiteUser {
  userId: string;
  role: string;
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
        select: { id: true, role: true },
      });
      if (!user) return next(new Error('User not found'));

      (socket as any).user = { userId: user.id, role: user.role } as SuiteUser;
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

    socket.on('disconnect', () => {
      logger.debug(`Suite socket disconnected: ${socket.id} (user: ${user.userId})`);
    });
  });
}
