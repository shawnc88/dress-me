import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { AuthPayload } from '../../middleware/auth';

interface ChatUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

export function setupChatSocket(io: SocketServer) {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true, role: true },
      });
      if (!user) return next(new Error('User not found'));

      (socket as any).user = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      } satisfies ChatUser;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as ChatUser;
    logger.debug(`Chat connected: ${user.username}`);

    // Join a stream's chat room
    socket.on('join-stream', async (streamId: string) => {
      socket.join(`stream:${streamId}`);

      // Increment viewer count
      await prisma.stream.update({
        where: { id: streamId },
        data: { viewerCount: { increment: 1 } },
      }).catch(() => {});

      socket.to(`stream:${streamId}`).emit('viewer-joined', {
        username: user.username,
        displayName: user.displayName,
      });
    });

    // Send chat message
    socket.on('chat-message', async (data: { streamId: string; content: string }) => {
      if (!data.content?.trim()) return;

      // Basic content filter (placeholder for AI moderation)
      const sanitized = data.content.trim().slice(0, 500);

      const message = await prisma.chatMessage.create({
        data: {
          streamId: data.streamId,
          userId: user.userId,
          content: sanitized,
        },
      });

      io.to(`stream:${data.streamId}`).emit('new-message', {
        id: message.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        content: sanitized,
        timestamp: message.createdAt,
      });
    });

    // Gift notification (sent after API processes the gift)
    socket.on('gift-sent', (data: { streamId: string; giftType: string; threads: number; message?: string }) => {
      io.to(`stream:${data.streamId}`).emit('gift-received', {
        sender: user.displayName,
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
