import { Server as SocketServer } from 'socket.io';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

/**
 * Suite-specific Socket.IO events for real-time invite/join/leave notifications.
 * Runs on the same io server as chat but uses a /suite namespace.
 */
export function setupSuiteSocket(io: SocketServer) {
  const suiteNs = io.of('/suite');

  suiteNs.on('connection', (socket) => {
    logger.debug(`Suite socket connected: ${socket.id}`);

    // Join a suite room for real-time updates
    socket.on('join-suite', async (data: { suiteId: string; userId: string }) => {
      socket.join(`suite:${data.suiteId}`);
      logger.info(`User ${data.userId} joined suite room ${data.suiteId}`);
    });

    // Creator broadcasts invite sent
    socket.on('invite-sent', (data: { suiteId: string; userIds: string[]; streamId: string }) => {
      // Broadcast to all connected users that invites were sent
      suiteNs.emit('suite-invite', {
        suiteId: data.suiteId,
        streamId: data.streamId,
        userIds: data.userIds,
      });
    });

    // Guest accepted and is joining
    socket.on('guest-joining', (data: { suiteId: string; userId: string; displayName: string; avatarUrl?: string }) => {
      suiteNs.to(`suite:${data.suiteId}`).emit('guest-joined', {
        userId: data.userId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
    });

    // Guest left or was removed
    socket.on('guest-left', (data: { suiteId: string; userId: string; reason: 'left' | 'removed' }) => {
      suiteNs.to(`suite:${data.suiteId}`).emit('guest-departed', {
        userId: data.userId,
        reason: data.reason,
      });
    });

    // Suite ended
    socket.on('suite-ended', (data: { suiteId: string }) => {
      suiteNs.to(`suite:${data.suiteId}`).emit('suite-closed', {
        suiteId: data.suiteId,
      });
    });

    socket.on('disconnect', () => {
      logger.debug(`Suite socket disconnected: ${socket.id}`);
    });
  });
}
