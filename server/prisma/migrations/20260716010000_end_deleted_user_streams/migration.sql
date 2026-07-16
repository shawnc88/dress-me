-- A deleted account's stream stuck in LIVE/SCHEDULED kept surfacing on home
-- ("Create stream" by "Deleted user"). Account deletion now ends both states;
-- this cleans up streams orphaned before that fix.
UPDATE "Stream"
SET "status" = 'ENDED'
WHERE "status" IN ('LIVE', 'SCHEDULED')
  AND "creatorId" IN (
    SELECT cp."id"
    FROM "CreatorProfile" cp
    JOIN "User" u ON u."id" = cp."userId"
    WHERE u."email" LIKE '%@deleted.local'
  );
