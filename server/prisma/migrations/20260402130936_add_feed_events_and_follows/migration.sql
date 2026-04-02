-- CreateTable
CREATE TABLE "FeedEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "streamId" TEXT,
    "event" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedEvent_userId_creatorId_idx" ON "FeedEvent"("userId", "creatorId");

-- CreateIndex
CREATE INDEX "FeedEvent_userId_event_idx" ON "FeedEvent"("userId", "event");

-- CreateIndex
CREATE INDEX "FeedEvent_creatorId_event_idx" ON "FeedEvent"("creatorId", "event");

-- CreateIndex
CREATE INDEX "FeedEvent_createdAt_idx" ON "FeedEvent"("createdAt");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_creatorId_idx" ON "UserFollow"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_creatorId_key" ON "UserFollow"("followerId", "creatorId");
