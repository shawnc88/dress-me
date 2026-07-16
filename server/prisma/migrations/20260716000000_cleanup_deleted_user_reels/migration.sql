-- Reels of soft-deleted accounts were left discoverable in feeds, surfacing
-- as "Deleted user / Loading reel…" cards (seen ranked first on For-You).
-- Account deletion now removes reels (users.ts / moderation.ts); this cleans
-- up rows orphaned before that fix. Likes/comments cascade via FK.
DELETE FROM "Reel"
WHERE "creatorId" IN (
  SELECT cp."id"
  FROM "CreatorProfile" cp
  JOIN "User" u ON u."id" = cp."userId"
  WHERE u."email" LIKE '%@deleted.local'
);
