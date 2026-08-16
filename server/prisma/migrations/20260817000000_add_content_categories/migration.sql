-- Content categories for Explore (chat, coding, cooking, music, ...)
ALTER TABLE "Stream" ADD COLUMN "category" TEXT;
ALTER TABLE "Reel" ADD COLUMN "category" TEXT;
CREATE INDEX "Stream_category_idx" ON "Stream"("category");
CREATE INDEX "Reel_category_idx" ON "Reel"("category");
