-- Hand-curated Featured shelf — the human editorial layer.
CREATE TABLE "FeaturedSlot" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeaturedSlot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeaturedSlot_creatorId_key" ON "FeaturedSlot"("creatorId");
CREATE INDEX "FeaturedSlot_position_idx" ON "FeaturedSlot"("position");
