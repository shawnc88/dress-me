import { prisma } from './prisma';

/**
 * User-generated-content safety helpers (App Store Guideline 1.2).
 *
 * When a user blocks someone, that person's content must disappear from the
 * blocker's feed instantly. Content (streams, reels) is keyed by CreatorProfile
 * id, but blocks are stored as User ids — so we resolve both directions and
 * translate to the CreatorProfile ids that feed queries filter on.
 */

/** Every User id this user has blocked, plus every user who has blocked them. */
export async function getBlockedUserIds(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  }
  return ids;
}

/** CreatorProfile ids whose content must be hidden from this user's feeds. */
export async function getBlockedCreatorIds(userId: string | null | undefined): Promise<Set<string>> {
  const userIds = await getBlockedUserIds(userId);
  if (userIds.size === 0) return new Set();
  const profiles = await prisma.creatorProfile.findMany({
    where: { userId: { in: [...userIds] } },
    select: { id: true },
  });
  return new Set(profiles.map(p => p.id));
}

/** Resolve a CreatorProfile id to its owning User id (block/report operate on User ids). */
export async function creatorIdToUserId(creatorId: string): Promise<string | null> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}
