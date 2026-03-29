-- CreateEnum
CREATE TYPE "RaffleStatus" AS ENUM ('OPEN', 'DRAWN', 'CANCELLED');

-- CreateTable
CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "streamId" TEXT,
    "title" TEXT NOT NULL,
    "status" "RaffleStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "maxWinners" INTEGER NOT NULL,
    "tierWeights" JSONB NOT NULL DEFAULT '{}',
    "drawSeed" TEXT,
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleEntry" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "subscriberUserId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "tickets" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleWinner" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "subscriberUserId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Raffle_creatorId_idx" ON "Raffle"("creatorId");

-- CreateIndex
CREATE INDEX "Raffle_streamId_idx" ON "Raffle"("streamId");

-- CreateIndex
CREATE INDEX "RaffleEntry_raffleId_idx" ON "RaffleEntry"("raffleId");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleEntry_raffleId_subscriberUserId_key" ON "RaffleEntry"("raffleId", "subscriberUserId");

-- CreateIndex
CREATE INDEX "RaffleWinner_raffleId_idx" ON "RaffleWinner"("raffleId");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleWinner_raffleId_subscriberUserId_key" ON "RaffleWinner"("raffleId", "subscriberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleWinner_raffleId_rank_key" ON "RaffleWinner"("raffleId", "rank");

-- AddForeignKey
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_subscriberUserId_fkey" FOREIGN KEY ("subscriberUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleWinner" ADD CONSTRAINT "RaffleWinner_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleWinner" ADD CONSTRAINT "RaffleWinner_subscriberUserId_fkey" FOREIGN KEY ("subscriberUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
