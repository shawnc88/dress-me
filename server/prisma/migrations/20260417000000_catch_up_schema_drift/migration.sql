-- Catch-up migration: brings prod DB in sync with schema.prisma
-- All changes are additive (new tables, new nullable columns, new indexes)

-- CreateTable: MonetizationEvent
CREATE TABLE "MonetizationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetizationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonetizationEvent_userId_idx" ON "MonetizationEvent"("userId");

-- CreateIndex
CREATE INDEX "MonetizationEvent_event_idx" ON "MonetizationEvent"("event");

-- CreateIndex
CREATE INDEX "MonetizationEvent_createdAt_idx" ON "MonetizationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MonetizationEvent_event_createdAt_idx" ON "MonetizationEvent"("event", "createdAt");

-- CreateTable: WebhookEventLog
CREATE TABLE "WebhookEventLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEventLog_provider_idx" ON "WebhookEventLog"("provider");

-- CreateIndex
CREATE INDEX "WebhookEventLog_eventType_idx" ON "WebhookEventLog"("eventType");

-- AlterTable: CreatorTier — add yearly pricing columns
ALTER TABLE "CreatorTier" ADD COLUMN "yearlyPriceCents" INTEGER;
ALTER TABLE "CreatorTier" ADD COLUMN "stripeYearlyPriceId" TEXT;
ALTER TABLE "CreatorTier" ADD COLUMN "appleYearlyProductId" TEXT;

-- CreateIndex: missing indexes flagged by schema
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");
CREATE INDEX IF NOT EXISTS "FanSubscription_currentPeriodEnd_idx" ON "FanSubscription"("currentPeriodEnd");
