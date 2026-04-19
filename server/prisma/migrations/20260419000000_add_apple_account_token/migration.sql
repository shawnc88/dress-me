-- AlterTable: Add Apple StoreKit appAccountToken to FanSubscription so Apple
-- webhook notifications can resolve back to the (userId, creatorId) pair that
-- initiated the purchase. Nullable because existing rows + all Stripe subs
-- don't carry one.
ALTER TABLE "FanSubscription" ADD COLUMN "appleAccountToken" TEXT;

-- Unique index so webhook lookup is O(1) and prevents token collision across
-- pending purchases.
CREATE UNIQUE INDEX "FanSubscription_appleAccountToken_key" ON "FanSubscription"("appleAccountToken");
