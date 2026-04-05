-- CreateTable
CREATE TABLE "WeeklyPlaybook" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "tasks" JSONB NOT NULL,
    "completedIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyPlaybook_creatorId_idx" ON "WeeklyPlaybook"("creatorId");

-- CreateIndex
CREATE INDEX "WeeklyPlaybook_weekStart_idx" ON "WeeklyPlaybook"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlaybook_creatorId_weekStart_key" ON "WeeklyPlaybook"("creatorId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyPlaybook" ADD CONSTRAINT "WeeklyPlaybook_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
