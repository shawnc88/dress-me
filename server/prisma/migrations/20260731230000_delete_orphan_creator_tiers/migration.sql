-- Remove CreatorTier rows keyed to a non-CreatorProfile id (briefly seeded
-- under User ids by the first version of the lazy-seed fix; the app only
-- queries tiers by CreatorProfile id, so these rows are unreachable).
DELETE FROM "CreatorTier" ct
WHERE NOT EXISTS (SELECT 1 FROM "CreatorProfile" cp WHERE cp.id = ct."creatorId");
