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
  // Followers + RSVP'd viewers (RSVP is a stronger commitment than a follow
  // and works without following), deduped.
  const follows = await prisma.userFollow.findMany({
    where: { creatorId },
    select: { followerId: true },
  });
  const rsvps = await prisma.streamRsvp.findMany({
    where: { streamId },
    select: { userId: true },
  }).catch(() => [] as { userId: string }[]);
  const recipientIds = [...new Set([...follows.map(f => f.followerId), ...rsvps.map(r => r.userId)])]
    .map(id => ({ followerId: id }));

  let sent = 0;
  for (const f of recipientIds) {
    if (await shouldSend(f.followerId, 'creator_live')) {
      const title = `${creatorName} is LIVE!`;
      const body = streamTitle;
      await sendPushToUser(f.followerId, { title, body, url: `/stream/${streamId}` });
      // In-app bell row too — push permission is optional, the bell is not.
      // Raw create (not createNotification) so we don't double-send the push.
      await prisma.notification.create({
        data: { userId: f.followerId, type: 'stream_live', title, body, data: { streamId, creatorId } },
      }).catch(() => {});
      await recordDelivery(f.followerId, 'creator_live', title, body, { streamId, creatorId });
      sent++;
    }
  }
  logger.info(`Smart push: creator_live for ${creatorName} sent to ${sent}/${recipientIds.length} followers+rsvps`);
}

// T-minus-15 reminder for scheduled shows. Swept every 5 minutes from
// index.ts: each stream sits in the [10m, 15m) window for exactly one sweep
// (the 5-min NotificationDelivery dedup absorbs boundary double-hits and
// restarts). RSVPs + followers, quiet hours honored via shouldSend.
export async function notifyShowsStartingSoon() {
  const now = Date.now();
  const upcoming = await prisma.stream.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledFor: { gte: new Date(now + 10 * 60 * 1000), lt: new Date(now + 15 * 60 * 1000) },
    },
    select: { id: true, title: true, creatorId: true, category: true },
  });
  for (const s of upcoming) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: s.creatorId },
      select: { user: { select: { displayName: true } } },
    });
    const name = creator?.user?.displayName || 'Your creator';
    const [follows, rsvps] = await Promise.all([
      prisma.userFollow.findMany({ where: { creatorId: s.creatorId }, select: { followerId: true } }),
      prisma.streamRsvp.findMany({ where: { streamId: s.id }, select: { userId: true } }),
    ]);
    const recipients = [...new Set([...rsvps.map(r => r.userId), ...follows.map(f => f.followerId)])];
    let sent = 0;
    for (const uid of recipients) {
      if (await shouldSend(uid, 'creator_live')) {
        const title = `${name} is live in 15 minutes`;
        const body = s.title;
        const url = `/class/${s.id}`; // landing works logged-out + flips to Join at go-live
        await sendPushToUser(uid, { title, body, url });
        await prisma.notification.create({
          data: { userId: uid, type: 'stream_live', title, body, data: { streamId: s.id, creatorId: s.creatorId } },
        }).catch(() => {});
        await recordDelivery(uid, 'creator_live', title, body, { streamId: s.id });
        sent++;
      }
    }
    logger.info(`Smart push: T-15 reminder for "${s.title}" sent to ${sent}/${recipients.length}`);
  }
}

// The creator megaphone: one announcement to every follower + fan-club
// member — "special guest tonight 9pm 🔥". This is how scheduled rooms get
// filled. Capped at 1/day at the route layer so it stays a signal, not spam.
export async function notifyAnnouncement(creatorId: string, creatorName: string, text: string, username?: string) {
  const [follows, club] = await Promise.all([
    prisma.userFollow.findMany({ where: { creatorId }, select: { followerId: true } }),
    prisma.fanClubMember.findMany({ where: { creatorId }, select: { userId: true } }).catch(() => [] as { userId: string }[]),
  ]);
  const recipients = [...new Set([...follows.map(f => f.followerId), ...club.map(c => c.userId)])];
  let sent = 0;
  for (const uid of recipients) {
    if (await shouldSend(uid, 'announcement')) {
      const title = `📣 ${creatorName}`;
      const url = username ? `/profile/${username}` : '/';
      await sendPushToUser(uid, { title, body: text, url });
      await prisma.notification.create({
        data: { userId: uid, type: 'announcement', title, body: text, data: { creatorId } },
      }).catch(() => {});
      await recordDelivery(uid, 'announcement', title, text, { creatorId });
      sent++;
    }
  }
  logger.info(`Smart push: announcement from ${creatorName} sent to ${sent}/${recipients.length}`);
  return { sent, recipients: recipients.length };
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

// ─── Playbook reminders ────────────────────────────────────────

export async function notifyPlaybookReminder(userId: string, taskType: 'live' | 'reel', taskTitle: string, cta: string) {
  const type = taskType === 'live' ? 'creator_live' : 'creator_reel';
  if (!(await shouldSend(userId, type))) return;
  const title = taskType === 'live' ? 'Go live now — your best time!' : 'Post your reel today';
  const body = cta || taskTitle;
  const url = taskType === 'live' ? '/dashboard/go-live' : '/create-reel';
  await sendPushToUser(userId, { title, body, url });
  await recordDelivery(userId, `playbook_${taskType}`, title, body);
}

/** Run daily: sends playbook reminders to all creators with tasks for today */
export async function sendPlaybookReminders() {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const today = dayNames[new Date().getUTCDay()];

  // Only send on playbook days
  if (!['MONDAY', 'WEDNESDAY', 'FRIDAY'].includes(today)) return;

  // Get Monday of current week
  const now = new Date();
  const dayNum = now.getUTCDay();
  const diff = dayNum === 0 ? -6 : 1 - dayNum;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));

  const playbooks = await prisma.weeklyPlaybook.findMany({
    where: { weekStart },
    include: { creator: { include: { user: true } } },
  });

  let sent = 0;
  for (const pb of playbooks) {
    const tasks = pb.tasks as any[];
    const completedIds = pb.completedIds as string[];

    // Find today's incomplete live/reel tasks
    const todayTasks = tasks.filter(
      (t: any) => t.day === today && (t.type === 'live' || t.type === 'reel') && !completedIds.includes(t.id)
    );

    for (const task of todayTasks) {
      await notifyPlaybookReminder(pb.creator.userId, task.type, task.title, task.cta);
      sent++;
    }
  }

  logger.info(`Playbook reminders: sent ${sent} notifications for ${today}`);

  // Goal-based notifications (Thursday/Saturday — nudge towards weekly targets)
  if (['THURSDAY', 'SATURDAY'].includes(today)) {
    await sendGoalReminders(weekStart);
  }
}

/** Send goal-proximity push notifications to creators close to their weekly targets */
async function sendGoalReminders(weekStart: Date) {
  const creators = await prisma.creatorProfile.findMany({
    where: { isOnboarded: true },
    include: { user: true },
  });

  let sent = 0;
  for (const creator of creators) {
    const liveCount = await prisma.stream.count({
      where: { creatorId: creator.id, startedAt: { gte: weekStart }, status: { in: ['ENDED', 'ARCHIVED', 'LIVE'] } },
    });
    const reelCount = await prisma.reel.count({
      where: { creatorId: creator.id, createdAt: { gte: weekStart } },
    });

    // "You're close to your weekly goal" — 2/3 lives or 2/3 reels
    if (liveCount === 2) {
      if (await shouldSend(creator.userId, 'streak_reminder')) {
        const title = 'One more live to hit your weekly goal!';
        const body = `You've done ${liveCount}/3 lives this week. Go live once more to crush it!`;
        await sendPushToUser(creator.userId, { title, body, url: '/dashboard/go-live' });
        await recordDelivery(creator.userId, 'playbook_goal', title, body);
        sent++;
      }
    }
    if (reelCount === 2) {
      if (await shouldSend(creator.userId, 'streak_reminder')) {
        const title = 'One more reel to complete your week!';
        const body = `${reelCount}/3 reels done. Post one more and you've nailed it!`;
        await sendPushToUser(creator.userId, { title, body, url: '/create-reel' });
        await recordDelivery(creator.userId, 'playbook_goal', title, body);
        sent++;
      }
    }

    // Achievement unlock — all goals hit
    if (liveCount >= 3 && reelCount >= 3) {
      if (await shouldSend(creator.userId, 'streak_reminder')) {
        const title = 'Weekly goals CRUSHED!';
        const body = '3 lives + 3 reels this week. You\'re in the top tier of creators.';
        await sendPushToUser(creator.userId, { title, body, url: '/dashboard/playbook' });
        await recordDelivery(creator.userId, 'playbook_goal', title, body);
        sent++;
      }
    }
  }
  logger.info(`Goal reminders: sent ${sent} notifications`);
}
