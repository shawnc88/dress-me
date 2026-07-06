/**
 * Seeds a demo account + content for the Apple App Review team.
 *
 * Idempotent — safe to run repeatedly (upserts by email/deterministic ids).
 * Run against PRODUCTION:
 *
 *   DATABASE_URL="<prod connection string>" \
 *   DEMO_PASSWORD="Reviewer!2026" \
 *   npx tsx scripts/seedDemoReviewer.ts
 *
 * Creates:
 *  - A verified CREATOR account the reviewer can log into.
 *  - A creator profile (onboarded) so creator surfaces render.
 *  - 3 reels backed by stable public sample videos (play via <video>).
 *  - 1 scheduled stream so the live/upcoming surfaces show real content.
 *
 * The sample clips are public HTTPS assets (Google sample bucket) and satisfy
 * ATS, so they play inside the iOS WKWebView. Swap for real content anytime.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = 'appreview@bewithme.live';
const USERNAME = 'ava_live';
const PASSWORD = process.env.DEMO_PASSWORD || 'Reviewer!2026';

// Stable, public, HTTPS sample clips (satisfy iOS ATS). object-cover crops to 9:16.
const REELS = [
  {
    id: 'demo-reel-blaze',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=720&h=1280&fit=crop',
    caption: 'Golden hour vibes ✨ come hang with me tonight',
    hashtags: ['live', 'goldenhour', 'bewithme'],
    likesCount: 1284, commentsCount: 96, sharesCount: 41, viewsCount: 18420,
  },
  {
    id: 'demo-reel-fun',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=720&h=1280&fit=crop',
    caption: 'Behind the scenes of today’s set 🎬',
    hashtags: ['bts', 'creator', 'music'],
    likesCount: 842, commentsCount: 58, sharesCount: 22, viewsCount: 9310,
  },
  {
    id: 'demo-reel-joy',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=720&h=1280&fit=crop',
    caption: 'Thank you for 18k 💜 celebrating live this weekend',
    hashtags: ['milestone', 'community', 'live'],
    likesCount: 2103, commentsCount: 187, sharesCount: 73, viewsCount: 31200,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: 'CREATOR', isVerified: true },
    create: {
      email: EMAIL,
      username: USERNAME,
      passwordHash,
      displayName: 'Ava Rivera',
      role: 'CREATOR',
      isVerified: true,
      threadBalance: 25000,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
      bio: 'Live entertainer & creator ✨ music, talk, and good energy every week. Tap in.',
    },
  });

  const profile = await prisma.creatorProfile.upsert({
    where: { userId: user.id },
    update: { isOnboarded: true },
    create: {
      userId: user.id,
      category: 'entertainment',
      isOnboarded: true,
      totalEarnings: 480000,
      threadBalance: 24000,
      tierBasicPrice: 0,
      tierPremiumPrice: 999,
      tierElitePrice: 2999,
      socialLinks: { instagram: '@ava.rivera', tiktok: '@avarivera' },
    },
  });

  for (const r of REELS) {
    await prisma.reel.upsert({
      where: { id: r.id },
      update: {
        creatorId: profile.id,
        videoUrl: r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        caption: r.caption,
        hashtags: r.hashtags,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        viewsCount: r.viewsCount,
      },
      create: {
        id: r.id,
        creatorId: profile.id,
        videoUrl: r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        caption: r.caption,
        hashtags: r.hashtags,
        duration: 15,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        viewsCount: r.viewsCount,
      },
    });
  }

  // Upcoming stream — shows on the home feed / streams surfaces as scheduled.
  const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.stream.upsert({
    where: { id: 'demo-stream-scheduled' },
    update: { creatorId: profile.id, status: 'SCHEDULED', scheduledFor },
    create: {
      id: 'demo-stream-scheduled',
      creatorId: profile.id,
      title: 'Friday Night Live Session ✨',
      description: 'Music, chat, and hanging out. Bring your energy — see you there!',
      status: 'SCHEDULED',
      streamType: 'PUBLIC',
      scheduledFor,
      thumbnailUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=720&h=1280&fit=crop',
    },
  });

  console.log('\n✅ Demo reviewer account seeded:\n');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Handle:   @${USERNAME} (${user.displayName}, CREATOR)`);
  console.log(`   Content:  ${REELS.length} reels + 1 scheduled stream\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
