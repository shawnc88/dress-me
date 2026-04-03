-- CreateTable
CREATE TABLE "ViewerSession" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "guestToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ViewerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamRevenue" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "creatorNetCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewerSession_streamId_isActive_idx" ON "ViewerSession"("streamId", "isActive");

-- CreateIndex
CREATE INDEX "ViewerSession_userId_idx" ON "ViewerSession"("userId");

-- CreateIndex
CREATE INDEX "ViewerSession_lastSeenAt_idx" ON "ViewerSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "StreamRevenue_streamId_idx" ON "StreamRevenue"("streamId");

-- CreateIndex
CREATE INDEX "StreamRevenue_creatorId_idx" ON "StreamRevenue"("creatorId");

-- CreateIndex
CREATE INDEX "StreamRevenue_createdAt_idx" ON "StreamRevenue"("createdAt");
