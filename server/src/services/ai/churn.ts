import { prisma } from '../../utils/prisma';

export interface ChurnPrediction {
  risk: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
}

export async function predictChurnRisk(userId: string): Promise<ChurnPrediction> {
  const factors: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      chatMessages: { orderBy: { createdAt: 'desc' }, take: 1 },
      sentGifts: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!user) {
    return { risk: 'high', score: 100, factors: ['User not found'] };
  }

  const now = Date.now();

  // Factor 1: Subscription status
  if (!user.subscription) {
    score += 30;
    factors.push('No active subscription');
  } else if (user.subscription.status === 'CANCELED') {
    score += 40;
    factors.push('Subscription canceled');
  } else if (user.subscription.status === 'PAST_DUE') {
    score += 35;
    factors.push('Subscription payment past due');
  } else if (user.subscription.cancelAtPeriodEnd) {
    score += 25;
    factors.push('Subscription set to cancel at period end');
  }

  // Factor 2: Last activity (chat messages)
  if (user.chatMessages.length > 0) {
    const daysSinceChat = (now - user.chatMessages[0].createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceChat > 30) {
      score += 25;
      factors.push(`No chat activity in ${Math.round(daysSinceChat)} days`);
    } else if (daysSinceChat > 14) {
      score += 15;
      factors.push(`Last chat activity ${Math.round(daysSinceChat)} days ago`);
    } else if (daysSinceChat > 7) {
      score += 5;
      factors.push(`Last chat activity ${Math.round(daysSinceChat)} days ago`);
    }
  } else {
    score += 20;
    factors.push('No chat messages ever sent');
  }

  // Factor 3: Gift engagement
  if (user.sentGifts.length > 0) {
    const daysSinceGift = (now - user.sentGifts[0].createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceGift > 30) {
      score += 15;
      factors.push('No gifts sent in 30+ days');
    }
  } else {
    score += 10;
    factors.push('Never sent a gift');
  }

  // Factor 4: Thread balance (low balance = less invested)
  if (user.threadBalance === 0) {
    score += 10;
    factors.push('Zero thread balance');
  }

  // Factor 5: Account age (newer accounts churn more)
  const daysSinceCreation = (now - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 7) {
    score += 15;
    factors.push('Account less than 7 days old');
  } else if (daysSinceCreation < 30) {
    score += 5;
    factors.push('Account less than 30 days old');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  let risk: 'low' | 'medium' | 'high';
  if (score >= 60) risk = 'high';
  else if (score >= 30) risk = 'medium';
  else risk = 'low';

  if (factors.length === 0) factors.push('No risk factors detected');

  return { risk, score, factors };
}
