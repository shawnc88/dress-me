import { prisma } from '../utils/prisma';

/**
 * Live Money Moment Engine
 *
 * Analyzes real-time stream state and generates actionable prompts
 * for creators to maximize earnings DURING their live stream.
 */

export interface MoneyMoment {
  id: string;
  type: 'gift_ask' | 'vip_push' | 'supporter_battle' | 'milestone' | 'engagement_peak' | 'timing';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  emoji: string;
}

interface StreamState {
  streamId: string;
  startedAt: Date;
  viewerCount: number;
  peakViewers: number;
}

export async function getMoneyMoments(streamId: string): Promise<MoneyMoment[]> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, startedAt: true, viewerCount: true, peakViewers: true, status: true },
  });
  if (!stream || !stream.startedAt || stream.status !== 'LIVE') return [];

  const moments: MoneyMoment[] = [];
  const now = Date.now();
  const streamStart = stream.startedAt.getTime();
  const minutesLive = Math.floor((now - streamStart) / 60000);

  // Get gifts from this stream
  const gifts = await prisma.gift.findMany({
    where: { streamId },
    select: { senderId: true, threads: true, giftType: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Recent gifts (last 5 minutes)
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);
  const recentGifts = gifts.filter(g => g.createdAt >= fiveMinAgo);
  const recentThreads = recentGifts.reduce((s, g) => s + g.threads, 0);

  // Total gifts
  const totalThreads = gifts.reduce((s, g) => s + g.threads, 0);
  const totalGifts = gifts.length;

  // Unique gifters
  const uniqueGifters = new Set(gifts.map(g => g.senderId));

  // Top 2 gifters for battle detection
  const gifterTotals: Record<string, number> = {};
  for (const g of gifts) {
    gifterTotals[g.senderId] = (gifterTotals[g.senderId] || 0) + g.threads;
  }
  const topGifters = Object.entries(gifterTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  // Chat activity (last 3 minutes)
  const threeMinAgo = new Date(now - 3 * 60 * 1000);
  const recentChat = await prisma.chatMessage.count({
    where: { streamId, createdAt: { gte: threeMinAgo } },
  });

  // ─── Moment Detection ───────────────────────────────────

  // 1. Gift velocity spike — gifts are flowing, push harder
  if (recentGifts.length >= 3 && recentThreads > 50) {
    moments.push({
      id: 'gift_velocity',
      type: 'gift_ask',
      title: 'Gifts are flowing!',
      description: `${recentGifts.length} gifts in the last 5 min ($${(recentThreads / 210).toFixed(2)}). Keep the energy up — now is the time to engage!`,
      urgency: 'high',
      emoji: '🔥',
    });
  }

  // 2. Supporter battle — top 2 gifters are close
  if (topGifters.length >= 2) {
    const [first, second] = topGifters;
    const gap = first[1] - second[1];
    if (gap < first[1] * 0.3 && first[1] > 30) {
      moments.push({
        id: 'supporter_battle',
        type: 'supporter_battle',
        title: 'Top supporter battle!',
        description: `Two fans are neck and neck! Shout them out — competition drives spending.`,
        urgency: 'high',
        emoji: '⚔️',
      });
    }
  }

  // 3. Engagement peak — high chat activity
  if (recentChat > 15 && stream.viewerCount > 5) {
    moments.push({
      id: 'engagement_peak',
      type: 'engagement_peak',
      title: 'Engagement is peaking!',
      description: `${recentChat} messages in 3 min. Your audience is hooked — great time to mention gifts or VIP.`,
      urgency: 'high',
      emoji: '📈',
    });
  }

  // 4. Optimal gift ask timing (10-15 min mark)
  if (minutesLive >= 10 && minutesLive <= 15 && totalGifts < 3) {
    moments.push({
      id: 'timing_optimal',
      type: 'timing',
      title: 'Prime time for gift asks',
      description: 'You\'re 10-15 min in — viewers are warmed up. This is the #1 window for gifts. Ask naturally!',
      urgency: 'medium',
      emoji: '⏰',
    });
  }

  // 5. Viewer milestone
  if (stream.viewerCount >= 10 && stream.viewerCount === stream.peakViewers) {
    moments.push({
      id: 'viewer_peak',
      type: 'milestone',
      title: `Peak viewers: ${stream.viewerCount}!`,
      description: 'You\'re at your highest viewer count! Capitalize — do something memorable right now.',
      urgency: 'medium',
      emoji: '🎯',
    });
  }

  // 6. VIP push — good time to mention subscriptions
  if (minutesLive >= 20 && stream.viewerCount >= 5 && !moments.find(m => m.type === 'engagement_peak')) {
    moments.push({
      id: 'vip_push',
      type: 'vip_push',
      title: 'Mention VIP access',
      description: '20+ minutes in with good viewership. Remind fans about subscriber benefits and exclusive content.',
      urgency: 'low',
      emoji: '👑',
    });
  }

  // 7. No gifts yet — gentle nudge
  if (minutesLive >= 8 && totalGifts === 0 && stream.viewerCount >= 3) {
    moments.push({
      id: 'no_gifts_yet',
      type: 'gift_ask',
      title: 'No gifts yet — break the ice',
      description: 'Set a small goal: "Can we hit 100 threads?" First gift always triggers more.',
      urgency: 'medium',
      emoji: '💡',
    });
  }

  // 8. Dry spell — no gifts in last 10 minutes
  if (totalGifts > 0 && recentGifts.length === 0 && minutesLive > 15) {
    const lastGift = gifts[0];
    const minsSinceGift = Math.floor((now - lastGift.createdAt.getTime()) / 60000);
    if (minsSinceGift >= 10) {
      moments.push({
        id: 'dry_spell',
        type: 'gift_ask',
        title: 'Gift energy is cooling down',
        description: `No gifts in ${minsSinceGift} min. Switch it up — try a poll, challenge, or shoutout to re-engage.`,
        urgency: 'medium',
        emoji: '🧊',
      });
    }
  }

  // 9. Earning milestone celebrations
  const earningsUsd = totalThreads / 210;
  const milestones = [10, 25, 50, 100, 250, 500];
  for (const m of milestones) {
    if (earningsUsd >= m && earningsUsd < m + 5) {
      moments.push({
        id: `milestone_${m}`,
        type: 'milestone',
        title: `You just passed $${m}!`,
        description: 'Celebrate it live! Thanking your community reinforces gifting behavior.',
        urgency: 'medium',
        emoji: '🎉',
      });
      break;
    }
  }

  // Sort by urgency
  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  moments.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return moments.slice(0, 3); // Max 3 active prompts
}
