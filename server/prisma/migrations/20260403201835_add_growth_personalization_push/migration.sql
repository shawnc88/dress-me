-- CreateTable
CREATE TABLE "UserPreferenceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fashionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stylingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liveScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reelsScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumAffinityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creatorAffinity" JSONB NOT NULL DEFAULT '{}',
    "hashtagAffinity" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRankingSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "watchTimeMs" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "commented" BOOLEAN NOT NULL DEFAULT false,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "followed" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "profileOpened" BOOLEAN NOT NULL DEFAULT false,
    "tierClicked" BOOLEAN NOT NULL DEFAULT false,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRankingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorLive" BOOLEAN NOT NULL DEFAULT true,
    "creatorReel" BOOLEAN NOT NULL DEFAULT true,
    "creatorStory" BOOLEAN NOT NULL DEFAULT true,
    "likes" BOOLEAN NOT NULL DEFAULT true,
    "comments" BOOLEAN NOT NULL DEFAULT true,
    "follows" BOOLEAN NOT NULL DEFAULT true,
    "gifts" BOOLEAN NOT NULL DEFAULT true,
    "mentions" BOOLEAN NOT NULL DEFAULT true,
    "streakReminder" BOOLEAN NOT NULL DEFAULT true,
    "comebackAlert" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "delivered" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorGrowthMetric" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "unfollows" INTEGER NOT NULL DEFAULT 0,
    "streamCount" INTEGER NOT NULL DEFAULT 0,
    "totalViewers" INTEGER NOT NULL DEFAULT 0,
    "avgWatchTimeMs" INTEGER NOT NULL DEFAULT 0,
    "followConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeatViewerRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reelViews" INTEGER NOT NULL DEFAULT 0,
    "reelLikes" INTEGER NOT NULL DEFAULT 0,
    "storyViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorGrowthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostStreamSummary" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "totalViewers" INTEGER NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "giftsReceived" INTEGER NOT NULL DEFAULT 0,
    "giftValueThreads" INTEGER NOT NULL DEFAULT 0,
    "chatMessages" INTEGER NOT NULL DEFAULT 0,
    "avgWatchTimeMs" INTEGER NOT NULL DEFAULT 0,
    "repeatViewerRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topFanUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostStreamSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceProfile_userId_key" ON "UserPreferenceProfile"("userId");

-- CreateIndex
CREATE INDEX "UserPreferenceProfile_userId_idx" ON "UserPreferenceProfile"("userId");

-- CreateIndex
CREATE INDEX "ContentRankingSignal_userId_idx" ON "ContentRankingSignal"("userId");

-- CreateIndex
CREATE INDEX "ContentRankingSignal_contentId_idx" ON "ContentRankingSignal"("contentId");

-- CreateIndex
CREATE INDEX "ContentRankingSignal_creatorId_idx" ON "ContentRankingSignal"("creatorId");

-- CreateIndex
CREATE INDEX "ContentRankingSignal_createdAt_idx" ON "ContentRankingSignal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRankingSignal_userId_contentId_key" ON "ContentRankingSignal"("userId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_pushToken_key" ON "PushDevice"("pushToken");

-- CreateIndex
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_idx" ON "NotificationDelivery"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationType_idx" ON "NotificationDelivery"("notificationType");

-- CreateIndex
CREATE INDEX "NotificationDelivery_sentAt_idx" ON "NotificationDelivery"("sentAt");

-- CreateIndex
CREATE INDEX "CreatorGrowthMetric_creatorId_idx" ON "CreatorGrowthMetric"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorGrowthMetric_date_idx" ON "CreatorGrowthMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorGrowthMetric_creatorId_date_key" ON "CreatorGrowthMetric"("creatorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PostStreamSummary_streamId_key" ON "PostStreamSummary"("streamId");

-- CreateIndex
CREATE INDEX "PostStreamSummary_creatorId_idx" ON "PostStreamSummary"("creatorId");

-- CreateIndex
CREATE INDEX "PostStreamSummary_createdAt_idx" ON "PostStreamSummary"("createdAt");
