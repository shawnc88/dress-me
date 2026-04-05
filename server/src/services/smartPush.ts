import { prisma } from '../utils/prisma';
import { sendPushToUser } from './pushNotifications';
import { logger } from '../utils/logger';

// ─── Check if notification should be sent ───────────────────────

async function shouldSend(
  userId: string,
  type: string,
): Promise<boolean> {
  // Check user preferences
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (prefs) {
    const prefMap: Record<string, boolean> = {
      creator_live: prefs.creatorLive,
      creator_reel: prefs.creatorReel,
      creator_story: prefs.creatorStory,
      like: prefs.likes,
      comment: prefs.comments,
      follow: prefs.follows,
      gift: prefs.gifts,
      mention: prefs.mentions,
      streak_reminder: prefs.streakReminder,
      comeback_alert: prefs.comebackAlert,
    };
    if (prefMap[type] === false) return false;

    // Check quiet hours
    if (prefs.quietHoursStart != null && prefs.quietHoursEnd != null) {
      const hour = new Date().getUTCHours();
      if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
        if (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd) return false;
      } else {
        // Wraps midnight (e.g., 22-7)
        if (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd) return false;
      }
    }
  }

  // Dedupe: don't send same type to same user within 5 minutes
  const recent = await prisma.notificationDelivery.findFirst({
    where: {
      userId,
      notificationType: type,
      sentAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  if (recent) return false;

  return true;
}

// ─── Record delivery ────────────────────────────────────────────

async function recordDelivery(userId: string, type: string, title: string, body: string, data?: any) {
  await prisma.notificationDelivery.create({
    data: { userId, notificationType: type, title, body, data },
  });
}

// ─── Smart notification senders ─────────────────────────────────

export async function notifyCreatorLive(creatorId: string, creatorName: string, streamTitle: string, streamId: string) {
  // Find followers of this creator
  const follows = await prisma.userFollow.findMany({
    where: { creatorId },
    select: { followerId: true },
  });

  let sent = 0;
  for (const f of follows) {
    if (await shouldSend(f.followerId, 'creator_live')) {
      const title = `${creatorName} is LIVE!`;
      const body = streamTitle;
      await sendPushToUser(f.followerId, { title, body, url: `/stream/${streamId}` });
      await recordDelivery(f.followerId, 'creator_live', title, body, { streamId, creatorId });
      sent++;
    }
  }
  logger.info(`Smart push: creator_live for ${creatorName} sent to ${sent}/${follows.length} followers`);
}

export async function notifyCreatorReel(creatorId: string, creatorName: string, reelId: string, caption?: string) {
  const follows = await prisma.userFollow.findMany({
    where: { creatorId },
    select: { followerId: true },
  });

  let sent = 0;
  for (const f of follows) {
    if (await shouldSend(f.followerId, 'creator_reel')) {
      const title = `${creatorName} posted a new reel`;
      const body = caption || 'Check it out!';
      await sendPushToUser(f.followerId, { title, body, url: `/reels/${reelId}` });
      await recordDelivery(f.followerId, 'creator_reel', title, body, { reelId, creatorId });
      sent++;
    }
  }
  logger.info(`Smart push: creator_reel for ${creatorName} sent to ${sent}/${follows.length} followers`);
}

export async function notifyStreakReminder(userId: string, currentStreak: number) {
  if (!(await shouldSend(userId, 'streak_reminder'))) return;
  const title = `Don't lose your ${currentStreak}-day streak!`;
  const body = 'Open Be With Me to keep your streak alive';
  await sendPushToUser(userId, { title, body, url: '/' });
  await recordDelivery(userId, 'streak_reminder', title, body);
}

export async function notifyComebackAlert(userId: string, creatorName?: string) {
  if (!(await shouldSend(userId, 'comeback_alert'))) return;
  const title = 'We miss you!';
  const body = creatorName ? `${creatorName} has been going live. Come back and check it out!` : 'New reels and live streams are waiting for you';
  await sendPushToUser(userId, { title, body, url: '/' });
  await recordDelivery(userId, 'comeback_alert', title, body);
}

export async function notifyGiftReceived(userId: string, senderName: string, giftType: string, streamId: string) {
  if (!(await shouldSend(userId, 'gift'))) return;
  const title = `${senderName} sent you a ${giftType}!`;
  const body = 'Someone loved your stream';
  await sendPushToUser(userId, { title, body, url: `/stream/${streamId}` });
  await recordDelivery(userId, 'gift', title, body, { streamId });
}

export async function notifyNewFollower(userId: string, followerName: string) {
  if (!(await shouldSend(userId, 'follow'))) return;
  const title = `${followerName} followed you`;
  const body = 'You have a new follower!';
  await sendPushToUser(userId, { title, body, url: '/profile' });
  await recordDelivery(userId, 'follow', title, body);
}
