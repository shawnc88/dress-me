import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Earnings Moment Engine
 *
 * Analyzes gift patterns during a stream to identify:
 * - Peak earning moments (time windows with highest gift volume)
 * - Top supporters (biggest spenders)
 * - Strategy insights (what triggered the spending)
 */

export interface EarningsMoment {
  timestamp: string;        // ISO time of the peak
  minuteMark: number;       // minutes into stream
  threads: number;          // threads earned in this window
  usd: string;              // converted to USD
  giftCount: number;        // number of gifts
  topGiftType: string;      // most common gift in this window
}

export interface TopSupporter {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalThreads: number;
  giftCount: number;
  topGift: string;
}

export interface EarningsBreakdown {
  streamId: string;
  streamTitle: string;
  duration: number;                 // seconds
  totalThreads: number;
  totalUsd: string;
  totalGifts: number;
  peakMoment: EarningsMoment | null;
  earningsTimeline: EarningsMoment[];  // 3-min windows
  topSupporters: TopSupporter[];       // top 5
  giftTypeBreakdown: Array<{ type: string; count: number; threads: number }>;
  strategy: string;                    // AI-detected best strategy
  strategyDetail: string;
}

// Gift type → base value mapping for strategy detection
const GIFT_VALUES: Record<string, number> = {
  heart: 5, sparkle: 10, star: 25, diamond: 50, crown: 100, fire: 200,
};

/**
 * Generate full earnings breakdown for a stream
 */
export async function getStreamEarningsBreakdown(streamId: string): Promise<EarningsBreakdown | null> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      title: true,
      startedAt: true,
      endedAt: true,
      peakViewers: true,
    },
  });
  if (!stream || !stream.startedAt) return null;

  const gifts = await prisma.gift.findMany({
    where: { streamId },
    include: {
      sender: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (gifts.length === 0) {
    return {
      streamId,
      streamTitle: stream.title,
      duration: stream.endedAt
        ? Math.round((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000)
        : 0,
      totalThreads: 0,
      totalUsd: '0.00',
      totalGifts: 0,
      peakMoment: null,
      earningsTimeline: [],
      topSupporters: [],
      giftTypeBreakdown: [],
      strategy: 'No gifts yet',
      strategyDetail: 'Keep engaging with your audience — gifts will come!',
    };
  }

  const streamStart = stream.startedAt.getTime();
  const duration = stream.endedAt
    ? Math.round((stream.endedAt.getTime() - streamStart) / 1000)
    : Math.round((Date.now() - streamStart) / 1000);

  // ─── Total earnings ────────────────────────────────────────

  const totalThreads = gifts.reduce((sum, g) => sum + g.threads, 0);
  const totalUsd = (totalThreads / 210).toFixed(2);

  // ─── Earnings timeline (3-minute windows) ──────────────────

  const WINDOW_MS = 3 * 60 * 1000; // 3 minutes
  const windows: Map<number, { threads: number; count: number; gifts: typeof gifts }> = new Map();

  for (const gift of gifts) {
    const minuteMark = Math.floor((gift.createdAt.getTime() - streamStart) / WINDOW_MS);
    if (!windows.has(minuteMark)) windows.set(minuteMark, { threads: 0, count: 0, gifts: [] });
    const w = windows.get(minuteMark)!;
    w.threads += gift.threads;
    w.count += 1;
    w.gifts.push(gift);
  }

  const earningsTimeline: EarningsMoment[] = [];
  let peakMoment: EarningsMoment | null = null;
  let peakThreads = 0;

  for (const [windowIdx, data] of windows.entries()) {
    // Find most common gift type in this window
    const typeCounts: Record<string, number> = {};
    for (const g of data.gifts) {
      typeCounts[g.giftType] = (typeCounts[g.giftType] || 0) + 1;
    }
    const topGiftType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'heart';

    const moment: EarningsMoment = {
      timestamp: new Date(streamStart + windowIdx * WINDOW_MS).toISOString(),
      minuteMark: windowIdx * 3,
      threads: data.threads,
      usd: (data.threads / 210).toFixed(2),
      giftCount: data.count,
      topGiftType,
    };

    earningsTimeline.push(moment);

    if (data.threads > peakThreads) {
      peakThreads = data.threads;
      peakMoment = moment;
    }
  }

  // Sort by time
  earningsTimeline.sort((a, b) => a.minuteMark - b.minuteMark);

  // ─── Top supporters ────────────────────────────────────────

  const supporterMap: Map<string, { user: typeof gifts[0]['sender']; threads: number; count: number; types: Record<string, number> }> = new Map();
  for (const gift of gifts) {
    const key = gift.senderId;
    if (!supporterMap.has(key)) {
      supporterMap.set(key, { user: gift.sender, threads: 0, count: 0, types: {} });
    }
    const s = supporterMap.get(key)!;
    s.threads += gift.threads;
    s.count += 1;
    s.types[gift.giftType] = (s.types[gift.giftType] || 0) + 1;
  }

  const topSupporters: TopSupporter[] = [...supporterMap.values()]
    .sort((a, b) => b.threads - a.threads)
    .slice(0, 5)
    .map(s => ({
      userId: s.user.id,
      username: s.user.username,
      displayName: s.user.displayName,
      avatarUrl: s.user.avatarUrl,
      totalThreads: s.threads,
      giftCount: s.count,
      topGift: Object.entries(s.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'heart',
    }));

  // ─── Gift type breakdown ───────────────────────────────────

  const typeMap: Record<string, { count: number; threads: number }> = {};
  for (const gift of gifts) {
    if (!typeMap[gift.giftType]) typeMap[gift.giftType] = { count: 0, threads: 0 };
    typeMap[gift.giftType].count += 1;
    typeMap[gift.giftType].threads += gift.threads;
  }
  const giftTypeBreakdown = Object.entries(typeMap)
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.threads - a.threads);

  // ─── Strategy detection ────────────────────────────────────

  const { strategy, strategyDetail } = detectStrategy(gifts, stream, peakMoment, topSupporters, earningsTimeline);

  return {
    streamId,
    streamTitle: stream.title,
    duration,
    totalThreads,
    totalUsd,
    totalGifts: gifts.length,
    peakMoment,
    earningsTimeline,
    topSupporters,
    giftTypeBreakdown,
    strategy,
    strategyDetail,
  };
}

// ─── Strategy detection heuristics ────────────────────────────

function detectStrategy(
  gifts: any[],
  stream: any,
  peakMoment: EarningsMoment | null,
  topSupporters: TopSupporter[],
  timeline: EarningsMoment[],
): { strategy: string; strategyDetail: string } {
  if (gifts.length === 0) {
    return { strategy: 'Build engagement first', strategyDetail: 'Chat more with viewers — engagement leads to gifting.' };
  }

  // Check if gifts are concentrated (one whale) or distributed
  const topSupporterPct = topSupporters.length > 0
    ? topSupporters[0].totalThreads / gifts.reduce((s, g) => s + g.threads, 0)
    : 0;

  // Check if there's a clear peak moment
  const hasClearPeak = peakMoment && timeline.length >= 2 &&
    peakMoment.threads > (gifts.reduce((s, g) => s + g.threads, 0) / timeline.length) * 2;

  // Check timing — early, mid, or late peak
  const streamDurationMin = stream.endedAt && stream.startedAt
    ? (stream.endedAt.getTime() - stream.startedAt.getTime()) / 60000
    : 30;
  const peakPosition = peakMoment ? peakMoment.minuteMark / streamDurationMin : 0.5;

  // High-value gift dominance
  const highValueGifts = gifts.filter(g => (GIFT_VALUES[g.giftType] || 0) >= 50);
  const highValuePct = highValueGifts.length / gifts.length;

  // Strategy selection
  if (topSupporterPct > 0.5 && topSupporters.length > 0) {
    return {
      strategy: 'VIP treatment drives your revenue',
      strategyDetail: `${topSupporters[0].displayName} contributed ${Math.round(topSupporterPct * 100)}% of your earnings. Give top gifters personal shoutouts and priority chat responses.`,
    };
  }

  if (hasClearPeak && peakPosition < 0.3) {
    return {
      strategy: 'Strong opener — your first minutes are gold',
      strategyDetail: `Your peak earnings hit at minute ${peakMoment!.minuteMark}. Your opening energy is your biggest asset — keep starting strong.`,
    };
  }

  if (hasClearPeak && peakPosition > 0.7) {
    return {
      strategy: 'Late-stream surge — build toward a climax',
      strategyDetail: `Earnings spiked at minute ${peakMoment!.minuteMark}. Your audience gifts most near the end — build excitement and save your best moment for late in the stream.`,
    };
  }

  if (hasClearPeak && peakPosition >= 0.3 && peakPosition <= 0.7) {
    return {
      strategy: 'Mid-stream peak — interactive moments pay',
      strategyDetail: `Your biggest earning moment was around minute ${peakMoment!.minuteMark}. This is when engagement peaks — plan interactive segments (polls, Q&A, challenges) for this window.`,
    };
  }

  if (highValuePct > 0.3) {
    return {
      strategy: 'Premium gifts are your bread and butter',
      strategyDetail: `${Math.round(highValuePct * 100)}% of your gifts were high-value. Your audience is willing to spend big — create more "wow moments" to trigger premium gifts.`,
    };
  }

  if (gifts.length > 20 && topSupporterPct < 0.2) {
    return {
      strategy: 'Community gifting is your strength',
      strategyDetail: `Gifts came from many viewers, not just one whale. Your community engagement is strong — keep making everyone feel included.`,
    };
  }

  // Default
  return {
    strategy: 'Keep engaging — consistency builds revenue',
    strategyDetail: 'The more you stream, the more your audience learns to gift. Try asking direct questions and acknowledging every gift live.',
  };
}
