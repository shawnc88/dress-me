import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const messageRouter = Router();

// GET /api/messages — List conversations (excludes empty / orphaned conversations)
messageRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        messages: { some: {} }, // exclude conversations with zero messages
      },
      orderBy: { lastAt: 'desc' },
      include: {
        user1: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // Get unread counts per conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.directMessage.count({
          where: { conversationId: conv.id, read: false, senderId: { not: userId } },
        });
        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
        return { id: conv.id, otherUser, lastMessage: conv.lastMessage, lastAt: conv.lastAt, unreadCount };
      })
    );

    res.json({ conversations: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:conversationId — Get messages in a conversation
messageRouter.get('/:conversationId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId },
    });
    if (!conv || (conv.user1Id !== userId && conv.user2Id !== userId)) {
      throw new AppError(404, 'Conversation not found');
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId: req.params.conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    // Mark unread messages as read
    await prisma.directMessage.updateMany({
      where: { conversationId: req.params.conversationId, senderId: { not: userId }, read: false },
      data: { read: true },
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/send — Send a message (creates conversation if needed)
messageRouter.post('/send', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId, content } = z.object({
      recipientId: z.string(),
      content: z.string().min(1).max(2000),
    }).parse(req.body);

    const userId = req.user!.userId;
    if (userId === recipientId) throw new AppError(400, 'Cannot message yourself');

    // Ensure recipient exists (avoid orphaned conversations pointing to deleted users)
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) throw new AppError(404, 'Recipient not found');

    // Find or create conversation AND write the message atomically — prevents orphaned
    // conversation rows (empty conversation bug) if message insert fails.
    const [id1, id2] = [userId, recipientId].sort();
    const { conv, message } = await prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({
        where: { user1Id_user2Id: { user1Id: id1, user2Id: id2 } },
      });

      const conv = existing
        ? await tx.conversation.update({
            where: { id: existing.id },
            data: { lastMessage: content, lastAt: new Date() },
          })
        : await tx.conversation.create({
            data: { user1Id: id1, user2Id: id2, lastMessage: content, lastAt: new Date() },
          });

      const message = await tx.directMessage.create({
        data: { conversationId: conv.id, senderId: userId, content },
        include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });

      return { conv, message };
    });

    res.status(201).json({ message, conversationId: conv.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/unread-count — Total unread messages
messageRouter.get('/unread/count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });
    const count = await prisma.directMessage.count({
      where: {
        conversationId: { in: convs.map(c => c.id) },
        senderId: { not: userId },
        read: false,
      },
    });
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
});
