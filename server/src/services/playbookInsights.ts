import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Dynamic Playbook Insights Engine
 *
 * Analyzes creator performance data and generates personalized recommendations:
 * - Best time to go live (based on peak viewer patterns)
 * - Best performing content type (live vs reel engagement)
 * - Trending topics (based on engagement spikes)
 * - Growth velocity (follower + engagement trends)
 */

export interface PlaybookInsight {
  type: 'best_time' | 'top_content' | 'growth_tip' | 'engagement_spike' | 'reel_tip';
  title: string;
  description: string;
  cta: string;
  priority: number; // 1 = highest
  data?: Record<string, any>;
}

// ─── Analyze best time to go live ────────────────────────────

async function analyzeBestStreamTime(creatorProfileId: string): Promise<PlaybookInsight | null> {
  const streams = await prisma.stream.findMany({
    where: {
      creatorId: creatorProfileId,
      status: { in: ['ENDED', 'ARCHIVED'] },
      startedAt: { not: null },
    },
    select: { startedAt: true, peakViewers: true, viewerCount: true },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  if (streams.length < 3) return null;

  // Group by hour bucket and find the best performing time
  const hourBuckets: Record<number, { totalPeak: number; count: number }> = {};
  for (const s of streams) {
    if (!s.startedAt) continue;
    const hour = s.startedAt.getUTCHours();
    if (!hourBuckets[hour]) hourBuckets[hour] = { totalPeak: 0, count: 0 };
    hourBuckets[hour].totalPeak += s.peakViewers;
    hourBuckets[hour].count += 1;
  }

  let bestHour = -1;
  let bestAvg = 0;
  for (const [hour, data] of Object.entries(hourBuckets)) {
    const avg = data.totalPeak / data.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = Number(hour);
    }
  }

  if (bestHour === -1) return null;

  // Format time
  const amPm = bestHour >= 12 ? 'PM' : 'AM';
  const displayHour = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
  const timeStr = `${displayHour}${amPm}`;

  // Compare to worst time
  let worstAvg = Infinity;
  for (const data of Object.values(hourBuckets)) {
    const avg = data.totalPeak / data.count;
    if (avg < worstAvg) worstAvg = avg;
  }
  const improvement = worstAvg > 0 ? Math.round(((bestAvg - worstAvg) / worstAvg) * 100) : 0;

  return {
    type: 'best_time',
    title: `Your best time to go live: ${timeStr} UTC`,
    description: `Streams around ${timeStr} UTC average ${Math.round(bestAvg)} peak viewers${improvement > 20 ? ` — ${improvement}% more than your worst slot` : ''}.`,
    cta: `"Go live at ${timeStr} tonight for maximum reach!"`,
    priority: 1,
    data: { bestHour, avgPeakViewers: Math.round(bestAvg), improvement },
  };
}

// ─── Analyze live vs reel performance ────────────────────────

async function analyzeContentPerformance(creatorProfileId: string, _userId: string): Promise<PlaybookInsight | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Live stream performance
  const streams = await prisma.stream.findMany({
    where: {
      creatorId: creatorProfileId,
      startedAt: { gte: thirtyDaysAgo },
      status: { in: ['ENDED', 'ARCHIVED'] },
    },
    select: {
      peakViewers: true,
      _count: { select: { gifts: true, chatMessages: true } },
    },
  });

  // Reel performance
  const reels = await prisma.reel.findMany({
    where: {
      creatorId: creatorProfileId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { likesCount: true, commentsCount: true, viewsCount: true },
  });

  if (streams.length === 0 && reels.length === 0) return null;

  const avgStreamEngagement = streams.length > 0
    ? streams.reduce((s, st) => s + st.peakViewers + st._count.gifts * 5 + st._count.chatMessages, 0) / streams.length
    : 0;

  const avgReelEngagement = reels.length > 0
    ? reels.reduce((s, r) => s + r.likesCount * 2 + r.commentsCount * 3 + r.viewsCount, 0) / reels.length
    : 0;

  if (avgStreamEngagement > avgReelEngagement * 1.5 && streams.length >= 2) {
    return {
      type: 'top_content',
      title: 'Your live streams outperform reels',
      description: `Live streams get ${Math.round(avgStreamEngagement / Math.max(avgReelEngagement, 1))}x more engagement than reels. Double down on going live!`,
      cta: '"Your audience loves live — go live more often!"',
      priority: 2,
      data: { avgStreamEngagement: Math.round(avgStreamEngagement), avgReelEngagement: Math.round(avgReelEngagement), winner: 'live' },
    };
  }

  if (avgReelEngagement > avgStreamEngagement * 1.5 && reels.length >= 2) {
    return {
      type: 'top_content',
      title: 'Your reels are your growth engine',
      description: `Reels get ${Math.round(avgReelEngagement / Math.max(avgStreamEngagement, 1))}x more engagement than live streams. Post more reels to grow faster.`,
      cta: '"Reels are working — post one more this week!"',
      priority: 2,
      data: { avgStreamEngagement: Math.round(avgStreamEngagement), avgReelEngagement: Math.round(avgReelEngagement), winner: 'reel' },
    };
  }

  return null;
}

// ─── Analyze follower growth velocity ────────────────────────

async function analyzeGrowth(creatorProfileId: string): Promise<PlaybookInsight | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.creatorGrowthMetric.findMany({
      where: { creatorId: creatorProfileId, date: { gte: sevenDaysAgo.toISOString().slice(0, 10) } },
      select: { newFollowers: true, totalViewers: true },
    }),
    prisma.creatorGrowthMetric.findMany({
      where: {
        creatorId: creatorProfileId,
        date: { gte: fourteenDaysAgo.toISOString().slice(0, 10), lt: sevenDaysAgo.toISOString().slice(0, 10) },
      },
      select: { newFollowers: true, totalViewers: true },
    }),
  ]);

  const thisWeekFollows = thisWeek.reduce((s, m) => s + m.newFollowers, 0);
  const lastWeekFollows = lastWeek.reduce((s, m) => s + m.newFollowers, 0);
  const thisWeekViews = thisWeek.reduce((s, m) => s + m.totalViewers, 0);

  if (thisWeekFollows === 0 && lastWeekFollows === 0) return null;

  if (thisWeekFollows > lastWeekFollows && lastWeekFollows > 0) {
    const growthPct = Math.round(((thisWeekFollows - lastWeekFollows) / lastWeekFollows) * 100);
    return {
      type: 'growth_tip',
      title: `Followers up ${growthPct}% this week!`,
      description: `You gained ${thisWeekFollows} new followers — keep the momentum going with consistent content.`,
      cta: '"Your growth is accelerating — don\'t slow down now!"',
      priority: 3,
      data: { thisWeekFollows, lastWeekFollows, growthPct, thisWeekViews },
    };
  }

  if (thisWeekFollows < lastWeekFollows && lastWeekFollows > 2) {
    const dropPct = Math.round(((lastWeekFollows - thisWeekFollows) / lastWeekFollows) * 100);
    return {
      type: 'growth_tip',
      title: 'Follower growth is slowing',
      description: `Down ${dropPct}% from last week. Try going live at a new time or posting a reel with a trending topic.`,
      cta: '"Mix it up this week — try a new content angle!"',
      priority: 2,
      data: { thisWeekFollows, lastWeekFollows, dropPct },
    };
  }

  return null;
}

// ─── Analyze recent engagement spikes ────────────────────────

async function analyzeEngagementSpikes(creatorProfileId: string): Promise<PlaybookInsight | null> {
  const streams = await prisma.stream.findMany({
    where: {
      creatorId: creatorProfileId,
      status: { in: ['ENDED', 'ARCHIVED'] },
      startedAt: { not: null },
    },
    select: {
      id: true,
      title: true,
      peakViewers: true,
      startedAt: true,
      _count: { select: { gifts: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  if (streams.length < 3) return null;

  const avgPeak = streams.reduce((s, st) => s + st.peakViewers, 0) / streams.length;

  // Find the best stream
  const best = streams.reduce((a, b) => (a.peakViewers > b.peakViewers ? a : b));

  if (best.peakViewers > avgPeak * 1.5) {
    const dayName = best.startedAt ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][best.startedAt.getUTCDay()] : 'recently';

    return {
      type: 'engagement_spike',
      title: `"${best.title}" was your top stream`,
      description: `${best.peakViewers} peak viewers (${Math.round((best.peakViewers / avgPeak - 1) * 100)}% above your average). It was on a ${dayName} — try that day/topic again.`,
      cta: `"Repeat what works — go live with a similar topic on ${dayName}!"`,
      priority: 2,
      data: { streamId: best.id, title: best.title, peakViewers: best.peakViewers, avgPeak: Math.round(avgPeak), dayName },
    };
  }

  return null;
}

// ─── Reel-specific insights ──────────────────────────────────

async function analyzeReelPerformance(creatorId: string): Promise<PlaybookInsight | null> {
  const reels = await prisma.reel.findMany({
    where: { creatorId },
    select: {
      id: true,
      caption: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (reels.length < 3) return null;

  // Get engagement data for these reels
  const reelIds = reels.map(r => r.id);
  const engagements = await prisma.reelEngagement.groupBy({
    by: ['reelId'],
    where: { reelId: { in: reelIds } },
    _count: true,
    _avg: { watchTimeMs: true },
  });
  const completions = await prisma.reelEngagement.groupBy({
    by: ['reelId'],
    where: { reelId: { in: reelIds }, completed: true },
    _count: true,
  });

  const engMap = new Map(engagements.map(e => [e.reelId, { total: e._count, avgWatch: e._avg.watchTimeMs || 0 }]));
  const compMap = new Map(completions.map(c => [c.reelId, c._count]));

  const reelStats = reels.map(r => {
    const eng = engMap.get(r.id);
    const comp = compMap.get(r.id) || 0;
    const views = eng?.total || r.viewsCount || 0;
    return {
      ...r,
      views,
      completionRate: views > 0 ? comp / views : 0,
      engagement: r.likesCount + r.commentsCount * 2,
    };
  }).filter(r => r.views > 0);

  if (reelStats.length === 0) return null;

  const avgCompletion = reelStats.reduce((s, r) => s + r.completionRate, 0) / reelStats.length;
  const best = reelStats.reduce((a, b) => (a.engagement > b.engagement ? a : b));

  if (avgCompletion < 0.3 && reelStats.length >= 3) {
    return {
      type: 'reel_tip',
      title: 'Hook viewers faster in your reels',
      description: `Only ${Math.round(avgCompletion * 100)}% of viewers watch your reels to the end. Start with a bang — the first 2 seconds decide everything.`,
      cta: '"Open with something shocking or surprising!"',
      priority: 3,
      data: { avgCompletionRate: Math.round(avgCompletion * 100) },
    };
  }

  if (best.engagement > 0 && best.caption) {
    return {
      type: 'reel_tip',
      title: 'Your best reel style is working',
      description: `"${best.caption.slice(0, 50)}..." got the most engagement. Make more content in this style.`,
      cta: '"Double down on what works — post a similar reel!"',
      priority: 4,
      data: { bestCaption: best.caption, likes: best.likesCount, comments: best.commentsCount },
    };
  }

  return null;
}

// ─── Main: get all insights for a creator ────────────────────

export async function getPlaybookInsights(userId: string): Promise<PlaybookInsight[]> {
  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });
    if (!creator) return [];

    const results = await Promise.allSettled([
      analyzeBestStreamTime(creator.id),
      analyzeContentPerformance(creator.id, creator.userId),
      analyzeGrowth(creator.id),
      analyzeEngagementSpikes(creator.id),
      analyzeReelPerformance(creator.id),
    ]);

    const insights: PlaybookInsight[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        insights.push(result.value);
      }
    }

    // Sort by priority (lowest number = highest priority)
    insights.sort((a, b) => a.priority - b.priority);

    return insights.slice(0, 5); // Max 5 insights
  } catch (err) {
    logger.error('Failed to generate playbook insights', err);
    return [];
  }
}
