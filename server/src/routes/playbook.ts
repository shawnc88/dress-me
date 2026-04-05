import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const playbookRouter = Router();

// ─── Playbook task structure ─────────────────────────────────

interface PlaybookTask {
  id: string;
  day: 'MONDAY' | 'WEDNESDAY' | 'FRIDAY';
  type: 'live' | 'reel' | 'cta';
  title: string;
  description: string;
  cta: string; // call-to-action suggestion for push / engagement
  emoji: string;
}

// ─── Niche-specific weekly content templates ─────────────────
// Each niche: Mon/Wed/Fri × (live + reel + CTA) = 9 tasks

const NICHE_TEMPLATES: Record<string, PlaybookTask[]> = {
  fitness: [
    // MONDAY
    { id: 'fit_mon_live', day: 'MONDAY', type: 'live', title: 'Morning Workout Routine', description: 'Go live with a full-body workout. Show proper form and keep energy high.', cta: '"Train with me — live right now!"', emoji: '🔥' },
    { id: 'fit_mon_reel', day: 'MONDAY', type: 'reel', title: '30-sec Core Workout', description: 'Quick core exercise demo. Keep it punchy and shareable.', cta: '"Try this 30-sec burn — can you keep up?"', emoji: '🎥' },
    { id: 'fit_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Start the week strong', description: 'Send push notification to your followers before going live.', cta: '"New week, new gains. Join my live workout now!"', emoji: '📣' },
    // WEDNESDAY
    { id: 'fit_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Q&A: Diet & Fitness Tips', description: 'Answer fan questions about diet, supplements, and training splits.', cta: '"Ask me anything about fitness — live now!"', emoji: '💬' },
    { id: 'fit_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Meal Prep Tips', description: 'Show a quick meal prep routine. High protein, easy to follow.', cta: '"This meal costs $5 and has 40g protein"', emoji: '🎥' },
    { id: 'fit_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Mid-week motivation', description: 'Push notification to keep momentum.', cta: '"Don\'t skip today. I\'m live with tips that actually work."', emoji: '📣' },
    // FRIDAY
    { id: 'fit_fri_live', day: 'FRIDAY', type: 'live', title: 'Full Workout Session', description: 'Go hard. Full workout stream — invite viewers to follow along.', cta: '"Friday grind. Train with me LIVE."', emoji: '🔥' },
    { id: 'fit_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Weekly Transformation Check', description: 'Quick progress reel or before/after. Motivate your community.', cta: '"One week of consistency. This is the difference."', emoji: '🎥' },
    { id: 'fit_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Weekend warrior', description: 'Drive attendance to your big Friday stream.', cta: '"No rest days. Be with me live — let\'s go!"', emoji: '📣' },
  ],
  fashion: [
    { id: 'fas_mon_live', day: 'MONDAY', type: 'live', title: 'Get Ready With Me', description: 'Go live while getting ready. Show your styling process and chat with fans.', cta: '"Getting ready — come pick my outfit!"', emoji: '💄' },
    { id: 'fas_mon_reel', day: 'MONDAY', type: 'reel', title: 'Outfit Transitions', description: 'Quick outfit change reel. Trending format, high shares.', cta: '"Which look is your favorite? 1, 2, or 3?"', emoji: '🎥' },
    { id: 'fas_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Style inspo', description: 'Push notification to kick off the style week.', cta: '"New week, new looks. See what I\'m wearing live!"', emoji: '📣' },
    { id: 'fas_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Fan Styling Session', description: 'React to fan outfits, answer style questions, give live advice.', cta: '"Send me your outfit — I\'ll rate it live!"', emoji: '💬' },
    { id: 'fas_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Trend Alert', description: 'Quick reel on a trending style, brand, or piece.', cta: '"This trend is everywhere. Here\'s how to wear it."', emoji: '🎥' },
    { id: 'fas_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Midweek style check', description: 'Drive engagement for your Wednesday session.', cta: '"Need outfit help? I\'m live styling fans right now."', emoji: '📣' },
    { id: 'fas_fri_live', day: 'FRIDAY', type: 'live', title: 'Night Out Prep & Styling', description: 'Style a full look live. Let fans vote on accessories.', cta: '"Help me choose tonight\'s look — vote live!"', emoji: '🔥' },
    { id: 'fas_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Haul or Thrift Finds', description: 'Show off recent pickups. Tag brands for extra reach.', cta: '"Everything under $30. Swipe to see the haul."', emoji: '🎥' },
    { id: 'fas_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Friday look', description: 'Push to get fans into your Friday styling stream.', cta: '"Friday fits live NOW. Be with me!"', emoji: '📣' },
  ],
  beauty: [
    { id: 'bea_mon_live', day: 'MONDAY', type: 'live', title: 'Skincare Routine Live', description: 'Walk fans through your morning skincare. Answer product questions.', cta: '"Morning skincare with me — ask me anything!"', emoji: '✨' },
    { id: 'bea_mon_reel', day: 'MONDAY', type: 'reel', title: 'Product Review', description: 'Quick honest review of a product. These get high saves.', cta: '"Honest review — is this worth the hype?"', emoji: '🎥' },
    { id: 'bea_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Glow up Monday', description: 'Push notification to start the beauty week.', cta: '"Start your week glowing. I\'m live with my full routine!"', emoji: '📣' },
    { id: 'bea_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Full Glam Tutorial', description: 'Step-by-step makeup look live. Respond to chat in real time.', cta: '"Full glam in 20 min — follow along live!"', emoji: '💬' },
    { id: 'bea_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Before & After Transformation', description: 'Dramatic before/after reel. High engagement format.', cta: '"The transformation is INSANE. Watch to the end."', emoji: '🎥' },
    { id: 'bea_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Tutorial day', description: 'Drive viewers to your mid-week tutorial.', cta: '"Learning a new look today? Be with me live!"', emoji: '📣' },
    { id: 'bea_fri_live', day: 'FRIDAY', type: 'live', title: 'Friday Night Glam', description: 'Get ready for the weekend live. Date night or going out look.', cta: '"Getting ready for tonight — join me!"', emoji: '🔥' },
    { id: 'bea_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Top 3 Products This Week', description: 'Quick roundup of what you loved this week.', cta: '"My top 3 this week. #3 is a game-changer."', emoji: '🎥' },
    { id: 'bea_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Weekend ready', description: 'Push notification for your Friday glam stream.', cta: '"Friday night glam is LIVE. Get ready with me!"', emoji: '📣' },
  ],
  lifestyle: [
    { id: 'lif_mon_live', day: 'MONDAY', type: 'live', title: 'Morning Routine Live', description: 'Start the week with a chill morning routine stream. Coffee, planning, vibes.', cta: '"Starting my week with you — come hang!"', emoji: '🌴' },
    { id: 'lif_mon_reel', day: 'MONDAY', type: 'reel', title: 'Week Reset Tips', description: 'Quick reel with 3 tips to start the week right.', cta: '"3 things I do every Monday to stay on track"', emoji: '🎥' },
    { id: 'lif_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: New week energy', description: 'Push notification for your Monday stream.', cta: '"New week vibes. Be with me live this morning!"', emoji: '📣' },
    { id: 'lif_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Day in My Life', description: 'Take fans through your day. Authentic, unfiltered content wins.', cta: '"Spend the day with me — going live now!"', emoji: '💬' },
    { id: 'lif_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Aesthetic Moment', description: 'Capture a beautiful moment — food, travel, home decor.', cta: '"POV: your mid-week escape"', emoji: '🎥' },
    { id: 'lif_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Midweek reset', description: 'Drive engagement for your Wednesday stream.', cta: '"Need a break? Come hang with me live."', emoji: '📣' },
    { id: 'lif_fri_live', day: 'FRIDAY', type: 'live', title: 'Weekend Plans Hangout', description: 'Chat about weekend plans. Ask fans what they\'re up to.', cta: '"What are you doing this weekend? Let\'s chat live!"', emoji: '🔥' },
    { id: 'lif_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Sunday Reset Routine', description: 'Self-care / wind-down reel. Relatable and shareable.', cta: '"My wind-down routine — save this for Sunday"', emoji: '🎥' },
    { id: 'lif_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Weekend hangout', description: 'Push before your Friday chill stream.', cta: '"Friday hangout starting now. Be with me!"', emoji: '📣' },
  ],
  coaching: [
    { id: 'coa_mon_live', day: 'MONDAY', type: 'live', title: 'Weekly Advice Session', description: 'Open floor for questions. Share your expertise and build trust.', cta: '"Free advice session — ask me anything live!"', emoji: '🧠' },
    { id: 'coa_mon_reel', day: 'MONDAY', type: 'reel', title: 'Quick Tip of the Week', description: 'One powerful tip in under 30 seconds. Value-packed.', cta: '"This one tip changed everything for me"', emoji: '🎥' },
    { id: 'coa_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Knowledge drop', description: 'Push to open your week of coaching content.', cta: '"Monday knowledge drop — I\'m live with free advice!"', emoji: '📣' },
    { id: 'coa_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Deep-Dive Q&A', description: 'Let fans submit questions beforehand. Go deep on answers.', cta: '"Your questions, my answers — live now!"', emoji: '💬' },
    { id: 'coa_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Story or Lesson', description: 'Share a personal story with a clear takeaway.', cta: '"I learned this the hard way so you don\'t have to"', emoji: '🎥' },
    { id: 'coa_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Midweek wisdom', description: 'Drive fans to your Wednesday Q&A.', cta: '"Got questions? I\'ve got answers. Live now."', emoji: '📣' },
    { id: 'coa_fri_live', day: 'FRIDAY', type: 'live', title: 'Workshop / Deep Session', description: 'Pick one topic and go deep. Teach something actionable.', cta: '"Free workshop happening NOW. Don\'t miss this."', emoji: '🔥' },
    { id: 'coa_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Motivational Closer', description: 'End the week with something inspiring. Set the tone for the weekend.', cta: '"You needed to hear this today"', emoji: '🎥' },
    { id: 'coa_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Friday workshop', description: 'Drive attendance to your Friday deep session.', cta: '"Join and ask me anything — live workshop NOW!"', emoji: '📣' },
  ],
  gaming: [
    { id: 'gam_mon_live', day: 'MONDAY', type: 'live', title: 'Ranked Grind Session', description: 'Go live grinding ranked. High energy, interact with chat.', cta: '"Ranked grind is ON. Come watch me climb!"', emoji: '🎮' },
    { id: 'gam_mon_reel', day: 'MONDAY', type: 'reel', title: 'Insane Play Clip', description: 'Best clip from recent gameplay. Short, punchy, shareable.', cta: '"No way I actually hit this shot"', emoji: '🎥' },
    { id: 'gam_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Monday grind', description: 'Push notification for your ranked session.', cta: '"The grind starts now. Be with me live!"', emoji: '📣' },
    { id: 'gam_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Viewer Games Night', description: 'Play with fans! Custom games, tournaments, or co-op.', cta: '"Playing WITH viewers tonight. Join the lobby!"', emoji: '💬' },
    { id: 'gam_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Tips & Tricks', description: 'Quick gameplay tip. Help your community improve.', cta: '"This trick will change your gameplay forever"', emoji: '🎥' },
    { id: 'gam_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Viewer games', description: 'Push to get fans into viewer games night.', cta: '"Viewer games TONIGHT. Spots are limited — join now!"', emoji: '📣' },
    { id: 'gam_fri_live', day: 'FRIDAY', type: 'live', title: 'New Game / Challenge Stream', description: 'Try something new or do a challenge. Keep it entertaining.', cta: '"Challenge stream is LIVE. Dare me to do anything!"', emoji: '🔥' },
    { id: 'gam_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Funny Moments Compilation', description: 'Best funny/fail moments from the week.', cta: '"The best (worst) moments from this week"', emoji: '🎥' },
    { id: 'gam_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Friday challenge', description: 'Push for your Friday gaming session.', cta: '"Friday night gaming is LIVE. Join the squad!"', emoji: '📣' },
  ],
  music: [
    { id: 'mus_mon_live', day: 'MONDAY', type: 'live', title: 'Practice Session / Jam', description: 'Go live while practicing or jamming. Raw and authentic.', cta: '"Jamming live — come hang and listen!"', emoji: '🎵' },
    { id: 'mus_mon_reel', day: 'MONDAY', type: 'reel', title: 'Song Cover Clip', description: 'Quick cover of a trending song. High discoverability.', cta: '"My take on [trending song]. What do you think?"', emoji: '🎥' },
    { id: 'mus_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Monday vibes', description: 'Push notification for your Monday jam session.', cta: '"Live jam session happening NOW. Be with me!"', emoji: '📣' },
    { id: 'mus_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Fan Request Night', description: 'Take song requests from chat. Interactive and fun.', cta: '"Request ANY song — I\'ll play it live!"', emoji: '💬' },
    { id: 'mus_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Behind the Music', description: 'Show your creative process — writing, producing, arranging.', cta: '"How I made this beat from scratch"', emoji: '🎥' },
    { id: 'mus_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Request night', description: 'Drive fans to your request session.', cta: '"Song request night is LIVE. Drop your picks!"', emoji: '📣' },
    { id: 'mus_fri_live', day: 'FRIDAY', type: 'live', title: 'Live Performance', description: 'Full performance stream. Treat it like a mini concert.', cta: '"Live show starting NOW. Don\'t miss this!"', emoji: '🔥' },
    { id: 'mus_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Original Snippet', description: 'Tease an original song or new material.', cta: '"Sneak peek of something new. Should I finish it?"', emoji: '🎥' },
    { id: 'mus_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Live show', description: 'Push for your Friday performance.', cta: '"The show starts NOW. Be with me live!"', emoji: '📣' },
  ],
  dating: [
    { id: 'dat_mon_live', day: 'MONDAY', type: 'live', title: 'Chat & Chill', description: 'Casual conversation stream. Build connection with your audience.', cta: '"Come talk to me — I\'m live and bored!"', emoji: '💕' },
    { id: 'dat_mon_reel', day: 'MONDAY', type: 'reel', title: 'Hot Take / Opinion', description: 'Share a bold take on dating or social life. Drives engagement.', cta: '"Unpopular opinion: [hot take]. Fight me."', emoji: '🎥' },
    { id: 'dat_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Monday chat', description: 'Push notification for your Monday chill stream.', cta: '"Be with me tonight — let\'s talk about anything!"', emoji: '📣' },
    { id: 'dat_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Ask Me Anything', description: 'Open Q&A about dating, relationships, social skills.', cta: '"AMA is live — ask the questions you\'re afraid to ask!"', emoji: '💬' },
    { id: 'dat_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Storytime', description: 'Tell a funny or dramatic story. Keep viewers hooked.', cta: '"The craziest thing happened to me... (storytime)"', emoji: '🎥' },
    { id: 'dat_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: AMA time', description: 'Drive viewers to your AMA session.', cta: '"I\'m answering EVERYTHING. Be with me live!"', emoji: '📣' },
    { id: 'dat_fri_live', day: 'FRIDAY', type: 'live', title: 'Friday Night Hangout', description: 'Chill Friday stream. Be present and engaging.', cta: '"No plans? Hang with me live tonight."', emoji: '🔥' },
    { id: 'dat_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Relationship Advice', description: 'Quick dating tip or advice. Relatable and shareable.', cta: '"Stop doing this on first dates. Trust me."', emoji: '🎥' },
    { id: 'dat_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Friday night', description: 'Push for your Friday hangout.', cta: '"Friday night hangout is LIVE. Come hang!"', emoji: '📣' },
  ],
  general: [
    { id: 'gen_mon_live', day: 'MONDAY', type: 'live', title: 'Start of Week Stream', description: 'Go live and connect with your audience. Share what\'s coming this week.', cta: '"New week starts NOW. Be with me live!"', emoji: '⭐' },
    { id: 'gen_mon_reel', day: 'MONDAY', type: 'reel', title: 'Quick Content Piece', description: 'Post a short, engaging reel in your style.', cta: '"New reel just dropped — go watch!"', emoji: '🎥' },
    { id: 'gen_mon_cta', day: 'MONDAY', type: 'cta', title: 'Push: Week kickoff', description: 'Push notification to start your content week.', cta: '"I\'m live right now — come say hi!"', emoji: '📣' },
    { id: 'gen_wed_live', day: 'WEDNESDAY', type: 'live', title: 'Fan Q&A / Chat', description: 'Mid-week check-in with your community.', cta: '"Let\'s catch up — I\'m live and taking questions!"', emoji: '💬' },
    { id: 'gen_wed_reel', day: 'WEDNESDAY', type: 'reel', title: 'Behind the Scenes', description: 'Show fans what goes on behind the camera.', cta: '"You never see this side of me... until now"', emoji: '🎥' },
    { id: 'gen_wed_cta', day: 'WEDNESDAY', type: 'cta', title: 'Push: Midweek check-in', description: 'Drive fans to your mid-week stream.', cta: '"Wednesday check-in — be with me live!"', emoji: '📣' },
    { id: 'gen_fri_live', day: 'FRIDAY', type: 'live', title: 'Feature Stream', description: 'Your main content stream of the week. Go all in.', cta: '"The big stream is LIVE. Don\'t miss it!"', emoji: '🔥' },
    { id: 'gen_fri_reel', day: 'FRIDAY', type: 'reel', title: 'Week Recap', description: 'Quick recap of the week\'s highlights.', cta: '"Best moments from this week — which was your fave?"', emoji: '🎥' },
    { id: 'gen_fri_cta', day: 'FRIDAY', type: 'cta', title: 'Push: Feature stream', description: 'Push to drive viewers to your big Friday stream.', cta: '"Be with me live tonight — it\'s going to be special!"', emoji: '📣' },
  ],
};

// Map "creator" category to "general" template
NICHE_TEMPLATES.creator = NICHE_TEMPLATES.general;

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

function getNicheTemplates(category: string): PlaybookTask[] {
  return NICHE_TEMPLATES[category] || NICHE_TEMPLATES.general;
}

// ─── GET / — Current week playbook (auto-generates) ─────────

playbookRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const weekStart = getCurrentWeekStart();

    let playbook = await prisma.weeklyPlaybook.findUnique({
      where: { creatorId_weekStart: { creatorId: creator.id, weekStart } },
    });

    if (!playbook) {
      const niche = creator.category || 'general';
      const tasks = getNicheTemplates(niche);

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

    const tasks = playbook.tasks as unknown as PlaybookTask[];
    const completedIds = playbook.completedIds as unknown as string[];
    const progress = tasks.length > 0 ? Math.round((completedIds.length / tasks.length) * 100) : 0;

    // Group by day
    const DAY_ORDER: string[] = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
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

// ─── POST /complete — Toggle task completion ─────────────────

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

    if (!tasks.find(t => t.id === taskId)) {
      throw new AppError(400, 'Invalid taskId');
    }

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

// ─── PUT /task — Edit a task (customization) ─────────────────

playbookRouter.put('/task', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, title, description, cta } = req.body;
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

    const tasks = playbook.tasks as unknown as PlaybookTask[];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new AppError(400, 'Invalid taskId');

    // Update only provided fields
    if (title !== undefined) tasks[taskIndex].title = title;
    if (description !== undefined) tasks[taskIndex].description = description;
    if (cta !== undefined) tasks[taskIndex].cta = cta;

    await prisma.weeklyPlaybook.update({
      where: { id: playbook.id },
      data: { tasks: tasks as unknown as any },
    });

    res.json({ task: tasks[taskIndex] });
  } catch (err) {
    next(err);
  }
});

// ─── POST /reset — Reset playbook to default niche template ──

playbookRouter.post('/reset', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!creator) throw new AppError(403, 'Creator profile required');

    const weekStart = getCurrentWeekStart();
    const niche = creator.category || 'general';
    const tasks = getNicheTemplates(niche);

    await prisma.weeklyPlaybook.upsert({
      where: { creatorId_weekStart: { creatorId: creator.id, weekStart } },
      update: { tasks: tasks as unknown as any, completedIds: [] as unknown as any, niche },
      create: {
        creatorId: creator.id,
        niche,
        weekStart,
        tasks: tasks as unknown as any,
        completedIds: [] as unknown as any,
      },
    });

    res.json({ reset: true, niche });
  } catch (err) {
    next(err);
  }
});

// ─── GET /history — Past weeks ───────────────────────────────

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

// ─── GET /niches — Available niches ──────────────────────────

playbookRouter.get('/niches', (_req: Request, res: Response) => {
  const niches = Object.keys(NICHE_TEMPLATES)
    .filter(n => n !== 'creator') // alias, don't list twice
    .map(id => ({ id, taskCount: NICHE_TEMPLATES[id].length }));
  res.json({ niches });
});
