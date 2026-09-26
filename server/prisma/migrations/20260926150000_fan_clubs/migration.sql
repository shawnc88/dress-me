-- Fan clubs: the coordinated-gifting social layer.
CREATE TABLE "FanClubMember" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FanClubMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FanClubMember_creatorId_userId_key" ON "FanClubMember"("creatorId", "userId");
CREATE INDEX "FanClubMember_creatorId_idx" ON "FanClubMember"("creatorId");
