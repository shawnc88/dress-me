import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const playbookRouter = Router();

// ─── Niche-specific weekly content templates ─────────────────

interface PlaybookTask {
  id: string;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  type: 'live' | 'reel' | 'push';
  title: string;
  description: string;
  emoji: string;
}

const NICHE_TEMPLATES: Record<string, PlaybookTask[]> = {
  fitness: [
    { id: 'f1', day: 'MONDAY', type: 'live', title: 'Morning Workout Routine', description: 'Go live with a full-body workout. Show proper form and keep energy high.', emoji: '🔥' },
    { id: 'f2', day: 'MONDAY', type: 'reel', title: '30-sec Core Workout', description: 'Quick core exercise demo. Keep it punchy and shareable.', emoji: '🎥' },
    { id: 'f3', day: 'WEDNESDAY', type: 'live', title: 'Q&A: Diet & Fitness Tips', description: 'Answer fan questions about diet, supplements, and training splits.', emoji: '💬' },
    { id: 'f4', day: 'WEDNESDAY', type: 'reel', title: 'Meal Prep Tips', description: 'Show a quick meal prep routine. High protein, easy to follow.', emoji: '🎥' },
    { id: 'f5', day: 'FRIDAY', type: 'live', title: 'Full Workout Session', description: 'Go hard. Full workout stream — invite viewers to follow along.', emoji: '🔥' },
    { id: 'f6', day: 'FRIDAY', type: 'push', title: '"Train with me live"', description: 'Send push notification 30min before your Friday stream.', emoji: '🎁' },
    { id: 'f7', day: 'SUNDAY', type: 'reel', title: 'Weekly Transformation Check', description: 'Quick progress reel or before/after. Motivate your community.', emoji: '🎥' },
  ],
  fashion: [
    { id: 'fa1', day: 'MONDAY', type: 'live', title: 'Get Ready With Me', description: 'Go live while getting ready. Show your styling process and chat with fans.', emoji: '💄' },
    { id: 'fa2', day: 'MONDAY', type: 'reel', title: 'Outfit Transitions', description: 'Quick outfit change reel. Trending format, high shares.', emoji: '🎥' },
    { id: 'fa3', day: 'WEDNESDAY', type: 'live', title: 'Fan Interaction Chat', description: 'Casual live session. Answer style questions, react to fan outfits.', emoji: '💬' },
    { id: 'fa4', day: 'WEDNESDAY', type: 'reel', title: 'Makeup or Hair Routine', description: 'Quick beauty routine reel. Keep it under 60 seconds.', emoji: '🎥' },
    { id: 'fa5', day: 'FRIDAY', type: 'live', title: 'Night Out Prep & Styling', description: 'Style a full look live. Let fans vote on accessories.', emoji: '🔥' },
    { id: 'fa6', day: 'FRIDAY', type: 'push', title: '"Help me choose tonight\'s look"', description: 'Push notification to drive viewers to your Friday live.', emoji: '🎁' },
    { id: 'fa7', day: 'SATURDAY', type: 'reel', title: 'Haul or Thrift Finds', description: 'Show off recent pickups. Tag brands for extra reach.', emoji: '🎥' },
  ],
  lifestyle: [
    { id: 'l1', day: 'MONDAY', type: 'live', title: 'Morning Routine Live', description: 'Start the week with a chill morning routine stream. Coffee, planning, vibes.', emoji: '🌴' },
    { id: 'l2', day: 'MONDAY', type: 'reel', title: 'Week Reset Tips', description: 'Quick reel with 3 tips to start the week right.', emoji: '🎥' },
    { id: 'l3', day: 'WEDNESDAY', type: 'live', title: 'Day in My Life', description: 'Take fans through your day. Authentic, unfiltered content wins.', emoji: '💬' },
    { id: 'l4', day: 'WEDNESDAY', type: 'reel', title: 'Aesthetic Moment', description: 'Capture a beautiful moment — food, travel, home decor.', emoji: '🎥' },
    { id: 'l5', day: 'FRIDAY', type: 'live', title: 'Weekend Plans Hangout', description: 'Chat about weekend plans. Ask fans what they\'re up to.', emoji: '🔥' },
    { id: 'l6', day: 'FRIDAY', type: 'push', title: '"Hang with me this weekend"', description: 'Push notification before your Friday chill stream.', emoji: '🎁' },
    { id: 'l7', day: 'SUNDAY', type: 'reel', title: 'Sunday Reset Routine', description: 'Self-care / wind-down reel. Relatable and shareable.', emoji: '🎥' },
  ],
  gaming: [
    { id: 'g1', day: 'MONDAY', type: 'live', title: 'Ranked Grind Session', description: 'Go live grinding ranked. High energy, interact with chat.', emoji: '🎮' },
    { id: 'g2', day: 'MONDAY', type: 'reel', title: 'Insane Play Clip', description: 'Best clip from recent gameplay. Short, punchy, shareable.', emoji: '🎥' },
    { id: 'g3', day: 'WEDNESDAY', type: 'live', title: 'Viewer Games Night', description: 'Play with fans! Custom games, tournaments, or co-op.', emoji: '💬' },
    { id: 'g4', day: 'WEDNESDAY', type: 'reel', title: 'Tips & Tricks', description: 'Quick gameplay tip. Help your community improve.', emoji: '🎥' },
    { id: 'g5', day: 'FRIDAY', type: 'live', title: 'New Game / Challenge Stream', description: 'Try something new or do a challenge. Keep it entertaining.', emoji: '🔥' },
    { id: 'g6', day: 'FRIDAY', type: 'push', title: '"Join the squad tonight"', description: 'Push notification for your Friday gaming session.', emoji: '🎁' },
    { id: 'g7', day: 'SATURDAY', type: 'reel', title: 'Funny Moments Compilation', description: 'Best funny/fail moments from the week.', emoji: '🎥' },
  ],
  coaching: [
    { id: 'c1', day: 'MONDAY', type: 'live', title: 'Weekly Advice Session', description: 'Open floor for questions. Share your expertise and build trust.', emoji: '🧠' },
    { id: 'c2', day: 'MONDAY', type: 'reel', title: 'Quick Tip of the Week', description: 'One powerful tip in under 30 seconds. Value-packed.', emoji: '🎥' },
    { id: 'c3', day: 'WEDNESDAY', type: 'reel', title: 'Story or Lesson', description: 'Share a personal story with a clear takeaway.', emoji: '🎥' },
    { id: 'c4', day: 'WEDNESDAY', type: 'live', title: 'Audience Q&A', description: 'Deep-dive Q&A. Let fans submit questions beforehand.', emoji: '💬' },
    { id: 'c5', day: 'FRIDAY', type: 'live', title: 'Deep Session / Workshop', description: 'Pick one topic and go deep. Teach something actionable.', emoji: '🔥' },
    { id: 'c6', day: 'FRIDAY', type: 'push', title: '"Join and ask me anything"', description: 'Drive attendance to your Friday deep-dive session.', emoji: '🎁' },
    { id: 'c7', day: 'SUNDAY', type: 'reel', title: 'Motivational Closer', description: 'End the week with something inspiring. Set the tone for next week.', emoji: '🎥' },
  ],
  music: [
    { id: 'm1', day: 'MONDAY', type: 'live', title: 'Practice Session / Jam', description: 'Go live while practicing or jamming. Raw and authentic.', emoji: '🎵' },
    { id: 'm2', day: 'MONDAY', type: 'reel', title: 'Song Cover Clip', description: 'Quick cover of a trending song. High discoverability.', emoji: '🎥' },
    { id: 'm3', day: 'WEDNESDAY', type: 'live', title: 'Fan Request Night', description: 'Take song requests from chat. Interactive and fun.', emoji: '💬' },
    { id: 'm4', day: 'WEDNESDAY', type: 'reel', title: 'Behind the Music', description: 'Show your creative process — writing, producing, arranging.', emoji: '🎥' },
    { id: 'm5', day: 'FRIDAY', type: 'live', title: 'Live Performance', description: 'Full performance stream. Treat it like a mini concert.', emoji: '🔥' },
    { id: 'm6', day: 'FRIDAY', type: 'push', title: '"Live show starting now"', description: 'Push notification for your Friday performance.', emoji: '🎁' },
    { id: 'm7', day: 'SATURDAY', type: 'reel', title: 'Original Snippet', description: 'Tease an original song or new material.', emoji: '🎥' },
  ],
  dating: [
    { id: 'd1', day: 'MONDAY', type: 'live', title: 'Chat & Chill', description: 'Casual conversation stream. Build connection with your audience.', emoji: '💕' },
    { id: 'd2', day: 'MONDAY', type: 'reel', title: 'Hot Take / Opinion', description: 'Share a bold take on dating or social life. Drives engagement.', emoji: '🎥' },
    { id: 'd3', day: 'WEDNESDAY', type: 'live', title: 'Ask Me Anything', description: 'Open Q&A about dating, relationships, social skills.', emoji: '💬' },
    { id: 'd4', day: 'WEDNESDAY', type: 'reel', title: 'Storytime', description: 'Tell a funny or dramatic story. Keep viewers hooked.', emoji: '🎥' },
    { id: 'd5', day: 'FRIDAY', type: 'live', title: 'Friday Night Hangout', description: 'Chill Friday stream. Be present and engaging.', emoji: '🔥' },
    { id: 'd6', day: 'FRIDAY', type: 'push', title: '"Come hang with me tonight"', description: 'Push notification for your Friday night stream.', emoji: '🎁' },
    { id: 'd7', day: 'SUNDAY', type: 'reel', title: 'Relationship Advice', description: 'Quick dating tip or advice. Relatable and shareable.', emoji: '🎥' },
  ],
  creator: [
    { id: 'cr1', day: 'MONDAY', type: 'live', title: 'Start of Week Stream', description: 'Go live and connect with your audience. Share what\'s coming this week.', emoji: '⭐' },
    { id: 'cr2', day: 'MONDAY', type: 'reel', title: 'Quick Content Piece', description: 'Post a short, engaging reel in your style.', emoji: '🎥' },
    { id: 'cr3', day: 'WEDNESDAY', type: 'live', title: 'Fan Q&A / Chat', description: 'Mid-week check-in with your community.', emoji: '💬' },
    { id: 'cr4', day: 'WEDNESDAY', type: 'reel', title: 'Behind the Scenes', description: 'Show fans what goes on behind the camera.', emoji: '🎥' },
    { id: 'cr5', day: 'FRIDAY', type: 'live', title: 'Feature Stream', description: 'Your main content stream of the week. Go all in.', emoji: '🔥' },
    { id: 'cr6', day: 'FRIDAY', type: 'push', title: '"Be with me live tonight"', description: 'Push to drive viewers to your feature stream.', emoji: '🎁' },
    { id: 'cr7', day: 'SUNDAY', type: 'reel', title: 'Week Recap', description: 'Quick recap of the week\'s highlights.', emoji: '🎥' },
  ],
};

// Helper: get Monday 00:00 UTC of the current week
function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

// GET /api/creators/playbook — Get current week's playbook (auto-generates if missing)
playbookRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const weekStart = getCurrentWeekStart();

    // Try to find existing playbook for this week
    let playbook = await prisma.weeklyPlaybook.findUnique({
      where: { creatorId_weekStart: { creatorId: creator.id, weekStart } },
    });

    // Auto-generate if none exists
    if (!playbook) {
      const niche = creator.category || 'creator';
      const tasks = NICHE_TEMPLATES[niche] || NICHE_TEMPLATES.creator;

      playbook = await prisma.weeklyPlaybook.create({
        data: {
          creatorId: creator.id,
          niche,
          weekStart,
          tasks: tasks as unknown as any,
          completedIds: [] as unknown as any,
        },
      });
    }

    // Calculate progress
    const tasks = playbook.tasks as unknown as PlaybookTask[];
    const completedIds = playbook.completedIds as unknown as string[];
    const progress = tasks.length > 0 ? Math.round((completedIds.length / tasks.length) * 100) : 0;

    // Group tasks by day
    const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const byDay: Record<string, (PlaybookTask & { completed: boolean })[]> = {};
    for (const task of tasks) {
      if (!byDay[task.day]) byDay[task.day] = [];
      byDay[task.day].push({ ...task, completed: completedIds.includes(task.id) });
    }
    const schedule = DAY_ORDER
      .filter(d => byDay[d])
      .map(d => ({ day: d, tasks: byDay[d] }));

    res.json({
      playbook: {
        id: playbook.id,
        niche: playbook.niche,
        weekStart: playbook.weekStart,
        progress,
        completedCount: completedIds.length,
        totalTasks: tasks.length,
      },
      schedule,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/playbook/complete — Toggle task completion
playbookRouter.post('/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.body;
    if (!taskId) throw new AppError(400, 'taskId required');

    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const weekStart = getCurrentWeekStart();
    const playbook = await prisma.weeklyPlaybook.findUnique({
      where: { creatorId_weekStart: { creatorId: creator.id, weekStart } },
    });
    if (!playbook) throw new AppError(404, 'No playbook for this week');

    const completedIds = playbook.completedIds as unknown as string[];
    const tasks = playbook.tasks as unknown as PlaybookTask[];

    // Verify taskId exists in tasks
    if (!tasks.find(t => t.id === taskId)) {
      throw new AppError(400, 'Invalid taskId');
    }

    // Toggle
    const newCompleted = completedIds.includes(taskId)
      ? completedIds.filter(id => id !== taskId)
      : [...completedIds, taskId];

    await prisma.weeklyPlaybook.update({
      where: { id: playbook.id },
      data: { completedIds: newCompleted },
    });

    const progress = tasks.length > 0 ? Math.round((newCompleted.length / tasks.length) * 100) : 0;

    res.json({
      taskId,
      completed: newCompleted.includes(taskId),
      progress,
      completedCount: newCompleted.length,
      totalTasks: tasks.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/playbook/history — Past weeks' playbooks
playbookRouter.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const playbooks = await prisma.weeklyPlaybook.findMany({
      where: { creatorId: creator.id },
      orderBy: { weekStart: 'desc' },
      take: 12,
    });

    const history = playbooks.map(p => {
      const tasks = p.tasks as unknown as PlaybookTask[];
      const completedIds = p.completedIds as unknown as string[];
      return {
        id: p.id,
        weekStart: p.weekStart,
        niche: p.niche,
        progress: tasks.length > 0 ? Math.round((completedIds.length / tasks.length) * 100) : 0,
        completedCount: completedIds.length,
        totalTasks: tasks.length,
      };
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/playbook/niches — List available niches and their templates
playbookRouter.get('/niches', (_req: Request, res: Response) => {
  const niches = Object.entries(NICHE_TEMPLATES).map(([id, tasks]) => ({
    id,
    taskCount: tasks.length,
    liveDays: [...new Set(tasks.filter(t => t.type === 'live').map(t => t.day))],
    reelDays: [...new Set(tasks.filter(t => t.type === 'reel').map(t => t.day))],
  }));
  res.json({ niches });
});
