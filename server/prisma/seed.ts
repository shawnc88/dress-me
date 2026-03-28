import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dressme.com' },
    update: {},
    create: {
      email: 'admin@dressme.com',
      username: 'admin',
      passwordHash: adminHash,
      displayName: 'Admin',
      role: 'ADMIN',
      isVerified: true,
      threadBalance: 10000,
    },
  });

  // Create demo creator
  const creatorHash = await bcrypt.hash('creator123!', 12);
  const creator = await prisma.user.upsert({
    where: { email: 'bella@dressme.com' },
    update: {},
    create: {
      email: 'bella@dressme.com',
      username: 'bella_style',
      passwordHash: creatorHash,
      displayName: 'Bella Fashion',
      role: 'CREATOR',
      isVerified: true,
      threadBalance: 5000,
      bio: 'Fashion designer & stylist. Live styling sessions every week!',
    },
  });

  // Create creator profile
  const creatorProfile = await prisma.creatorProfile.upsert({
    where: { userId: creator.id },
    update: {},
    create: {
      userId: creator.id,
      category: 'fashion',
      totalEarnings: 250000,
      threadBalance: 12500,
      socialLinks: {
        instagram: '@bella_style',
        tiktok: '@bellafashion',
      },
    },
  });

  // Create demo viewer
  const viewerHash = await bcrypt.hash('viewer123!', 12);
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@dressme.com' },
    update: {},
    create: {
      email: 'viewer@dressme.com',
      username: 'fashionfan',
      passwordHash: viewerHash,
      displayName: 'Fashion Fan',
      role: 'VIEWER',
      threadBalance: 500,
    },
  });

  // Create a subscription for the viewer
  await prisma.subscription.upsert({
    where: { userId: viewer.id },
    update: {},
    create: {
      userId: viewer.id,
      tier: 'PREMIUM',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create demo streams
  const liveStream = await prisma.stream.create({
    data: {
      creatorId: creatorProfile.id,
      title: 'Spring Collection 2026 - Live Styling',
      description: 'Join me as I showcase the hottest spring trends and style outfits live!',
      status: 'LIVE',
      streamType: 'PUBLIC',
      startedAt: new Date(),
      viewerCount: 47,
      peakViewers: 82,
    },
  });

  const scheduledStream = await prisma.stream.create({
    data: {
      creatorId: creatorProfile.id,
      title: 'Weekend Wardrobe Essentials',
      description: 'Building the perfect weekend capsule wardrobe on a budget.',
      status: 'SCHEDULED',
      streamType: 'PREMIUM',
      scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const archivedStream = await prisma.stream.create({
    data: {
      creatorId: creatorProfile.id,
      title: 'Date Night Outfits - Top 10 Looks',
      description: 'My favorite date night outfits for every budget.',
      status: 'ARCHIVED',
      streamType: 'PUBLIC',
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      viewerCount: 0,
      peakViewers: 156,
    },
  });

  // Create chat messages for the live stream
  await prisma.chatMessage.createMany({
    data: [
      { streamId: liveStream.id, userId: viewer.id, content: 'Love this outfit! 🔥', type: 'TEXT' },
      { streamId: liveStream.id, userId: admin.id, content: 'Welcome everyone to the stream!', type: 'SYSTEM' },
      { streamId: liveStream.id, userId: viewer.id, content: 'Can you show the accessories?', type: 'TEXT' },
    ],
  });

  // Create a gift
  await prisma.gift.create({
    data: {
      streamId: liveStream.id,
      senderId: viewer.id,
      giftType: 'sparkle',
      threads: 50,
      message: 'Amazing style!',
    },
  });

  // Create a poll
  await prisma.poll.create({
    data: {
      streamId: liveStream.id,
      question: 'Which outfit should I style next?',
      options: [
        { id: '1', text: 'Casual Brunch Look', votes: 23 },
        { id: '2', text: 'Office Chic', votes: 31 },
        { id: '3', text: 'Street Style', votes: 18 },
      ],
      isActive: true,
    },
  });

  // Create a giveaway
  await prisma.giveaway.create({
    data: {
      creatorId: creatorProfile.id,
      title: 'Spring Style Box Giveaway',
      description: 'Win a curated spring style box worth $250!',
      prizeDetails: 'Curated spring fashion box including: designer sunglasses, silk scarf, statement earrings, and a $100 gift card.',
      prizeValueUsd: 25000,
      rulesUrl: 'https://dressme.com/giveaway/spring-style-box/rules',
      amoeMethod: 'Send a postcard with your name, email, and "Spring Style Box" to: Dress Me Giveaways, PO Box 1234, Los Angeles, CA 90001',
      eligibility: 'Must be 18+ and a US resident. Void where prohibited.',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seed complete!');
  console.log(`  Admin: admin@dressme.com / admin123!`);
  console.log(`  Creator: bella@dressme.com / creator123!`);
  console.log(`  Viewer: viewer@dressme.com / viewer123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
