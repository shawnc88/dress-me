-- CreateEnum
CREATE TYPE "CreatorTierName" AS ENUM ('SUPPORTER', 'VIP', 'INNER_CIRCLE');

-- CreateEnum
CREATE TYPE "FanSubStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'APPLE_IAP');

-- CreateEnum
CREATE TYPE "SuiteStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "SelectionMode" AS ENUM ('MANUAL', 'WEIGHTED', 'RANDOMIZED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REMOVED');

-- CreateTable
CREATE TABLE "CreatorTier" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" "CreatorTierName" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "description" TEXT NOT NULL DEFAULT '',
    "benefits" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "slotLimit" INTEGER,
    "stripePriceId" TEXT,
    "appleProductId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "status" "FanSubStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" "BillingProvider" NOT NULL,
    "providerSubscriptionId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FanSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiteSession" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "livekitRoom" TEXT NOT NULL,
    "status" "SuiteStatus" NOT NULL DEFAULT 'WAITING',
    "maxGuests" INTEGER NOT NULL DEFAULT 3,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "livekitEgressId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuiteSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiteCandidate" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "tierName" "CreatorTierName" NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "weightScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuiteCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiteSelection" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "selectedUserIds" TEXT[],
    "mode" "SelectionMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuiteSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiteInvite" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "SuiteInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorTier_creatorId_idx" ON "CreatorTier"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorTier_creatorId_name_key" ON "CreatorTier"("creatorId", "name");

-- CreateIndex
CREATE INDEX "FanSubscription_userId_idx" ON "FanSubscription"("userId");

-- CreateIndex
CREATE INDEX "FanSubscription_creatorId_idx" ON "FanSubscription"("creatorId");

-- CreateIndex
CREATE INDEX "FanSubscription_tierId_idx" ON "FanSubscription"("tierId");

-- CreateIndex
CREATE INDEX "FanSubscription_status_idx" ON "FanSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FanSubscription_userId_creatorId_key" ON "FanSubscription"("userId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "SuiteSession_streamId_key" ON "SuiteSession"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "SuiteSession_livekitRoom_key" ON "SuiteSession"("livekitRoom");

-- CreateIndex
CREATE INDEX "SuiteSession_streamId_idx" ON "SuiteSession"("streamId");

-- CreateIndex
CREATE INDEX "SuiteSession_creatorId_idx" ON "SuiteSession"("creatorId");

-- CreateIndex
CREATE INDEX "SuiteSession_status_idx" ON "SuiteSession"("status");

-- CreateIndex
CREATE INDEX "SuiteCandidate_suiteId_idx" ON "SuiteCandidate"("suiteId");

-- CreateIndex
CREATE INDEX "SuiteCandidate_userId_idx" ON "SuiteCandidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SuiteCandidate_suiteId_userId_key" ON "SuiteCandidate"("suiteId", "userId");

-- CreateIndex
CREATE INDEX "SuiteSelection_suiteId_idx" ON "SuiteSelection"("suiteId");

-- CreateIndex
CREATE INDEX "SuiteInvite_suiteId_idx" ON "SuiteInvite"("suiteId");

-- CreateIndex
CREATE INDEX "SuiteInvite_userId_idx" ON "SuiteInvite"("userId");

-- CreateIndex
CREATE INDEX "SuiteInvite_status_idx" ON "SuiteInvite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SuiteInvite_suiteId_userId_key" ON "SuiteInvite"("suiteId", "userId");

-- AddForeignKey
ALTER TABLE "FanSubscription" ADD CONSTRAINT "FanSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanSubscription" ADD CONSTRAINT "FanSubscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "CreatorTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiteCandidate" ADD CONSTRAINT "SuiteCandidate_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "SuiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiteSelection" ADD CONSTRAINT "SuiteSelection_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "SuiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiteInvite" ADD CONSTRAINT "SuiteInvite_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "SuiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
