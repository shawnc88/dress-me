import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { notifyPostLike, notifyComment } from '../services/notifications';
import multer from 'multer';

export const postRouter = Router();

// Configure multer for image uploads — store in memory as base64
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed') as any);
    }
  },
});

// POST /api/posts — Create a post with image upload
postRouter.post(
  '/',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'Image is required');
      }

      const caption = req.body.caption?.trim() || null;

      // Convert buffer to base64 data URL
      const base64 = req.file.buffer.toString('base64');
      const imageUrl = `data:${req.file.mimetype};base64,${base64}`;

      const post = await prisma.post.create({
        data: {
          userId: req.user!.userId,
          imageUrl,
          caption,
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });

      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts — Get feed (all posts, newest first)
postRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const cursor = req.query.cursor as string | undefined;

      const posts = await prisma.post.findMany({
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
          likes: {
            take: 0, // We'll check liked status separately if auth'd
          },
        },
      });

      // Check if the requesting user has liked each post
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const { env } = require('../config/env');
          const payload = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as any;
          userId = payload.userId;
        } catch {}
      }

      let likedPostIds = new Set<string>();
      if (userId) {
        const userLikes = await prisma.postLike.findMany({
          where: { userId, postId: { in: posts.map((p) => p.id) } },
          select: { postId: true },
        });
        likedPostIds = new Set(userLikes.map((l) => l.postId));
      }

      const feed = posts.map((post) => ({
        id: post.id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        createdAt: post.createdAt,
        user: post.user,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        isLiked: likedPostIds.has(post.id),
      }));

      res.json({
        posts: feed,
        nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/like — Toggle like
postRouter.post(
  '/:id/like',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = req.params.id;
      const userId = req.user!.userId;

      const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await prisma.postLike.delete({ where: { id: existing.id } });
        const count = await prisma.postLike.count({ where: { postId } });
        res.json({ liked: false, likeCount: count });
      } else {
        await prisma.postLike.create({ data: { postId, userId } });
        const count = await prisma.postLike.count({ where: { postId } });

        // Notify post owner (not self)
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
        if (post && post.userId !== userId) {
          const liker = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
          notifyPostLike(post.userId, liker?.displayName || 'Someone', postId).catch(() => {});
        }

        res.json({ liked: true, likeCount: count });
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/posts/:id/comments — Get comments for a post
postRouter.get(
  '/:id/comments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comments = await prisma.postComment.findMany({
        where: { postId: req.params.id },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        take: 100,
      });

      res.json({ comments });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/comments — Add a comment
postRouter.post(
  '/:id/comments',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ content: z.string().min(1).max(500) });
      const { content } = schema.parse(req.body);

      const post = await prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) throw new AppError(404, 'Post not found');

      const comment = await prisma.postComment.create({
        data: {
          postId: req.params.id,
          userId: req.user!.userId,
          content,
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      const commentCount = await prisma.postComment.count({ where: { postId: req.params.id } });

      // Notify post owner (not self)
      if (post.userId !== req.user!.userId) {
        notifyComment(post.userId, comment.user.displayName, post.id).catch(() => {});
      }

      res.status(201).json({ comment, commentCount });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id — Delete your own post
postRouter.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) throw new AppError(404, 'Post not found');
      if (post.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'Not your post');
      }

      await prisma.post.delete({ where: { id: req.params.id } });
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  }
);
