-- Reprice fan-subscription tiers to the post-Guideline-3.0 ladder:
-- Supporter $4.99 (unchanged) / VIP $24.99 -> $19.99 / Inner Circle $44.99 -> $39.99.
-- Null the cached Stripe price IDs on repriced rows so checkout mints a fresh
-- Stripe Price at the new amount (fanSubscriptions.ts caches the first Price it
-- creates and reuses it forever). Guarded by the old price so any creator who
-- was given a custom price is left untouched.

UPDATE "CreatorTier"
SET "priceCents" = 1999, "stripePriceId" = NULL, "stripeYearlyPriceId" = NULL
WHERE "name" = 'VIP' AND "priceCents" = 2499;

UPDATE "CreatorTier"
SET "priceCents" = 3999, "stripePriceId" = NULL, "stripeYearlyPriceId" = NULL
WHERE "name" = 'INNER_CIRCLE' AND "priceCents" = 4499;
