import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  isLivekitConfigured,
  createRoom as createLivekitRoom,
  deleteRoom as deleteLivekitRoom,
} from '../services/streaming/livekit';
import {
  buildCandidateList,
  manualSelect,
  weightedSelect,
  randomizedSelect,
} from '../services/suite/selectionEngine';
import { generateSuiteToken } from '../services/suite/suiteTokens';

export const suiteRouter = Router();

const INVITE_EXPIRY_MINUTES = 5;

/**
 * Verify the authenticated user owns the stream's creator profile.
 * Returns the suite or throws 403/404.
 */
async function verifySuiteOwnership(streamId: string, userId: string) {
  const suite = await prisma.suiteSession.findUnique({
    where: { streamId },
    include: { },
  });
  if (!suite) throw new AppError(404, 'No suite for this stream');

  // Load the stream to verify creator ownership
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { creator: true },
  });
  if (!stream) throw new AppError(404, 'Stream not found');
  if (stream.creator.userId !== userId) {
    throw new AppError(403, 'Not your stream');
  }

  return suite;
}

// ─── POST /api/streams/:streamId/suite/open — Create Suite session ──

suiteRouter.post(
  '/:streamId/suite/open',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxGuests = 3, isPublic = false, minTier = 'VIP' } = z.object({
        maxGuests: z.number().min(1).max(3).optional(),
        isPublic: z.boolean().optional(),
        minTier: z.enum(['SUPPORTER', 'VIP', 'INNER_CIRCLE']).optional(),
      }).parse(req.body);

      const stream = await prisma.stream.findUnique({
        where: { id: req.params.streamId },
        include: { creator: true },
      });
      if (!stream) throw new AppError(404, 'Stream not found');
      if (stream.creator.userId !== req.user!.userId) {
        throw new AppError(403, 'Not your stream');
      }

      // Check if suite already exists for this stream
      const existing = await prisma.suiteSession.findUnique({
        where: { streamId: stream.id },
      });
      if (existing && existing.status !== 'ENDED') {
        throw new AppError(400, 'Suite already active for this stream');
      }

      const roomName = `suite-${stream.id}-${Date.now()}`;

      // Create LiveKit room for Suite
      if (isLivekitConfigured()) {
        await createLivekitRoom(roomName);
      }

      const suite = await prisma.suiteSession.create({
        data: {
          streamId: stream.id,
          creatorId: stream.creatorId,
          livekitRoom: roomName,
          maxGuests,
          isPublic,
        },
      });

      // Build candidate list from subscribers
      const stats = await buildCandidateList(
        stream.creatorId,
        stream.id,
        suite.id,
        minTier as any,
      );

      logger.info(`Suite opened for stream ${stream.id}: ${stats.eligible} eligible / ${stats.total} total subscribers`);

      res.status(201).json({
        suite,
        candidates: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/streams/:streamId/suite/candidates — Get eligible fans ──

suiteRouter.get(
  '/:streamId/suite/candidates',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      const candidates = await prisma.suiteCandidate.findMany({
        where: { suiteId: suite.id, eligible: true },
        orderBy: { weightScore: 'desc' },
      });

      // Enrich with user info
      const userIds = candidates.map(c => c.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      res.json({
        candidates: candidates.map(c => ({
          ...c,
          user: userMap[c.userId],
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/select — Select fans ──

suiteRouter.post(
  '/:streamId/suite/select',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode, userIds, count } = z.object({
        mode: z.enum(['manual', 'weighted', 'randomized']),
        userIds: z.array(z.string()).optional(),
        count: z.number().min(1).max(3).optional(),
      }).parse(req.body);

      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      let selectedIds: string[];

      if (mode === 'manual') {
        if (!userIds || userIds.length === 0) {
          throw new AppError(400, 'userIds required for manual selection');
        }
        if (userIds.length > suite.maxGuests) {
          throw new AppError(400, `Max ${suite.maxGuests} guests allowed`);
        }
        await manualSelect(suite.id, userIds);
        selectedIds = userIds;
      } else if (mode === 'weighted') {
        selectedIds = await weightedSelect(suite.id, count || suite.maxGuests);
      } else {
        selectedIds = await randomizedSelect(suite.id, count || suite.maxGuests);
      }

      // Get user info for selected fans
      const selectedUsers = await prisma.user.findMany({
        where: { id: { in: selectedIds } },
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      });

      res.json({ selected: selectedUsers, mode });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/invite — Send Suite invites ──

suiteRouter.post(
  '/:streamId/suite/invite',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userIds } = z.object({
        userIds: z.array(z.string()).min(1).max(3),
      }).parse(req.body);

      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000);

      const invites = await Promise.all(
        userIds.map(userId =>
          prisma.suiteInvite.upsert({
            where: { suiteId_userId: { suiteId: suite.id, userId } },
            update: { status: 'PENDING', expiresAt, sentAt: new Date(), respondedAt: null, joinedAt: null },
            create: { suiteId: suite.id, userId, expiresAt },
          })
        )
      );

      // Create notifications for each invited fan
      await Promise.all(
        userIds.map(userId =>
          prisma.notification.create({
            data: {
              userId,
              type: 'suite_invite',
              title: 'You\'re invited to the Suite!',
              body: 'A creator has selected you to join their live Suite session. Tap to join!',
              data: {
                suiteId: suite.id,
                streamId: req.params.streamId,
                expiresAt: expiresAt.toISOString(),
              },
            },
          })
        )
      );

      logger.info(`Suite invites sent: ${userIds.length} fans for stream ${req.params.streamId}`);
      res.json({ invites });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/invite-by-username — Direct invite ──

suiteRouter.post(
  '/:streamId/suite/invite-by-username',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = z.object({
        username: z.string().min(1).max(30),
      }).parse(req.body);

      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true, displayName: true, username: true },
      });
      if (!user) throw new AppError(404, 'User not found');

      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000);

      const invite = await prisma.suiteInvite.upsert({
        where: { suiteId_userId: { suiteId: suite.id, userId: user.id } },
        update: { status: 'PENDING', expiresAt, sentAt: new Date(), respondedAt: null, joinedAt: null },
        create: { suiteId: suite.id, userId: user.id, expiresAt },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'suite_invite',
          title: 'You\'re invited to the Suite!',
          body: 'A creator has selected you to join their live Suite session. Tap to join!',
          data: {
            suiteId: suite.id,
            streamId: req.params.streamId,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      logger.info(`Suite direct invite sent to @${username} for stream ${req.params.streamId}`);
      res.json({ invite, user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/respond — Accept/decline invite ──

suiteRouter.post(
  '/:streamId/suite/respond',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accept } = z.object({ accept: z.boolean() }).parse(req.body);

      const suite = await prisma.suiteSession.findUnique({
        where: { streamId: req.params.streamId },
      });
      if (!suite) throw new AppError(404, 'No suite for this stream');

      const invite = await prisma.suiteInvite.findUnique({
        where: { suiteId_userId: { suiteId: suite.id, userId: req.user!.userId } },
      });
      if (!invite) throw new AppError(404, 'No invite found');
      if (invite.status !== 'PENDING') {
        throw new AppError(400, `Invite already ${invite.status.toLowerCase()}`);
      }
      if (new Date() > invite.expiresAt) {
        await prisma.suiteInvite.update({
          where: { id: invite.id },
          data: { status: 'EXPIRED' },
        });
        throw new AppError(400, 'Invite has expired');
      }

      if (accept) {
        await prisma.suiteInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });

        // Activate suite if first guest
        if (suite.status === 'WAITING') {
          await prisma.suiteSession.update({
            where: { id: suite.id },
            data: { status: 'ACTIVE', startedAt: new Date() },
          });
        }

        res.json({ accepted: true, suiteRoom: suite.livekitRoom });
      } else {
        await prisma.suiteInvite.update({
          where: { id: invite.id },
          data: { status: 'DECLINED', respondedAt: new Date() },
        });
        res.json({ accepted: false });
      }
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/join-token — Get LiveKit token ──

suiteRouter.post(
  '/:streamId/suite/join-token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suite = await prisma.suiteSession.findUnique({
        where: { streamId: req.params.streamId },
      });
      if (!suite) throw new AppError(404, 'No suite for this stream');

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, displayName: true, role: true },
      });
      if (!user) throw new AppError(404, 'User not found');

      // Determine role: host (creator) or selected_guest
      const creator = await prisma.creatorProfile.findFirst({
        where: { id: suite.creatorId, userId: req.user!.userId },
      });
      const isHost = !!creator;

      if (!isHost) {
        // Must have an accepted invite
        const invite = await prisma.suiteInvite.findUnique({
          where: { suiteId_userId: { suiteId: suite.id, userId: req.user!.userId } },
        });
        if (!invite || invite.status !== 'ACCEPTED') {
          throw new AppError(403, 'No accepted invite for this Suite');
        }

        // Mark as joined
        await prisma.suiteInvite.update({
          where: { id: invite.id },
          data: { joinedAt: new Date() },
        });
      }

      const role = isHost ? 'host' : 'selected_guest';
      const token = await generateSuiteToken(
        suite.livekitRoom,
        req.user!.userId,
        user.displayName,
        role,
      );

      if (!env.LIVEKIT_WS_URL) {
        throw new AppError(503, 'LiveKit is not configured — Suite unavailable');
      }

      res.json({
        token,
        room: suite.livekitRoom,
        role,
        wsUrl: env.LIVEKIT_WS_URL,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/remove-guest — Remove a guest ──

suiteRouter.post(
  '/:streamId/suite/remove-guest',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.body);

      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      // Update invite status
      await prisma.suiteInvite.update({
        where: { suiteId_userId: { suiteId: suite.id, userId } },
        data: { status: 'REMOVED' },
      });

      // Remove from LiveKit room
      if (isLivekitConfigured()) {
        const { RoomServiceClient } = await import('livekit-server-sdk');
        const host = (process.env.LIVEKIT_WS_URL || '').replace('wss://', 'https://');
        const svc = new RoomServiceClient(
          host,
          process.env.LIVEKIT_API_KEY,
          process.env.LIVEKIT_API_SECRET,
        );
        await svc.removeParticipant(suite.livekitRoom, userId);
      }

      logger.info(`Guest ${userId} removed from suite ${suite.id}`);
      res.json({ removed: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/streams/:streamId/suite/end — End Suite session ──

suiteRouter.post(
  '/:streamId/suite/end',
  authenticate,
  requireRole('CREATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suite = await verifySuiteOwnership(req.params.streamId, req.user!.userId);

      // End suite
      await prisma.suiteSession.update({
        where: { id: suite.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      // Clean up LiveKit room
      if (isLivekitConfigured()) {
        try {
          await deleteLivekitRoom(suite.livekitRoom);
        } catch (err) {
          logger.warn(`Failed to delete LiveKit room ${suite.livekitRoom}:`, err);
        }
      }

      // Expire any pending invites
      await prisma.suiteInvite.updateMany({
        where: { suiteId: suite.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      logger.info(`Suite ended for stream ${req.params.streamId}`);
      res.json({ ended: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/streams/:streamId/suite/status — Suite status (public) ──

suiteRouter.get(
  '/:streamId/suite/status',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suite = await prisma.suiteSession.findUnique({
        where: { streamId: req.params.streamId },
        include: {
          invites: {
            where: { status: { in: ['ACCEPTED'] } },
            select: { userId: true, joinedAt: true },
          },
        },
      });

      if (!suite) {
        return res.json({ hasSuite: false });
      }

      // Only expose participant details if the suite is public or requester is the creator
      const isCreatorOwner = req.user ? await prisma.stream.findFirst({
        where: { id: req.params.streamId, creator: { userId: req.user.userId } },
      }) : null;

      const joinedCount = suite.invites.filter(i => i.joinedAt).length;

      // Public-safe metadata only — no user details unless authorized
      if (!isCreatorOwner && !suite.isPublic) {
        return res.json({
          hasSuite: true,
          status: suite.status,
          isPublic: suite.isPublic,
          maxGuests: suite.maxGuests,
          currentGuests: joinedCount,
        });
      }

      // Authorized view — include participant info
      const joinedUserIds = suite.invites.filter(i => i.joinedAt).map(i => i.userId);
      const participants = await prisma.user.findMany({
        where: { id: { in: joinedUserIds } },
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      });

      res.json({
        hasSuite: true,
        status: suite.status,
        isPublic: suite.isPublic,
        maxGuests: suite.maxGuests,
        currentGuests: participants.length,
        participants,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/streams/:streamId/suite/my-invite — Check my invite status ──

suiteRouter.get(
  '/:streamId/suite/my-invite',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suite = await prisma.suiteSession.findUnique({
        where: { streamId: req.params.streamId },
      });
      if (!suite) return res.json({ invited: false });

      const invite = await prisma.suiteInvite.findUnique({
        where: { suiteId_userId: { suiteId: suite.id, userId: req.user!.userId } },
      });

      res.json({
        invited: !!invite,
        invite,
      });
    } catch (err) {
      next(err);
    }
  }
);
