-- Real payout queue: threads escrow into a request, settled by hand
-- (Wise/Payoneer) and marked PAID with a transfer reference.
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "threads" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutRequest_creatorId_idx" ON "PayoutRequest"("creatorId");
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

ALTER TABLE "CreatorProfile" ADD COLUMN "payoutMethod" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "payoutHandle" TEXT;
