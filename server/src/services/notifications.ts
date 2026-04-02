import { prisma } from '../utils/prisma';
import { sendPushToUser } from './pushNotifications';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || undefined,
    },
  });

  // Send browser push notification (non-blocking)
  sendPushToUser(params.userId, {
    title: params.title,
    body: params.body,
    icon: '/icon-192.png',
    url: '/',
  }).catch(() => {});

  return notification;
}

export async function notifyNewFollower(userId: string, followerName: string) {
  return createNotification({
    userId,
    type: 'new_follower',
    title: 'New Follower',
    body: `${followerName} started following you`,
    data: { followerName },
  });
}

export async function notifyGiftReceived(creatorUserId: string, senderName: string, giftType: string, threads: number) {
  return createNotification({
    userId: creatorUserId,
    type: 'gift_received',
    title: 'Gift Received!',
    body: `${senderName} sent you a ${giftType} (${threads} threads)`,
    data: { senderName, giftType, threads },
  });
}

export async function notifyStreamLive(followerId: string, creatorName: string, streamId: string) {
  return createNotification({
    userId: followerId,
    type: 'stream_live',
    title: `${creatorName} is Live!`,
    body: `${creatorName} just went live. Tune in now!`,
    data: { creatorName, streamId },
  });
}

export async function notifyComment(postOwnerId: string, commenterName: string, postId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'new_comment',
    title: 'New Comment',
    body: `${commenterName} commented on your post`,
    data: { commenterName, postId },
  });
}

export async function notifyPostLike(postOwnerId: string, likerName: string, postId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'post_like',
    title: 'New Like',
    body: `${likerName} liked your post`,
    data: { likerName, postId },
  });
}
