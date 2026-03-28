import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getRecommendedStreams, getTrendingCreators } from '../services/ai/recommendations';
import { predictChurnRisk } from '../services/ai/churn';

export const recommendationRouter = Router();

// Get personalized stream recommendations
recommendationRouter.get('/streams', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const streams = await getRecommendedStreams(req.user!.userId, limit);
    res.json({ streams });
  } catch (err) {
    next(err);
  }
});

// Get trending creators
recommendationRouter.get('/creators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const creators = await getTrendingCreators(limit);
    res.json({ creators });
  } catch (err) {
    next(err);
  }
});

// Get churn risk for a user (admin only)
recommendationRouter.get(
  '/churn/:userId',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await predictChurnRisk(req.params.userId);
      res.json({ prediction });
    } catch (err) {
      next(err);
    }
  }
);
