-- Notes: 60-char presence status above the DM inbox, 24h expiry.
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Note_userId_idx" ON "Note"("userId");
CREATE INDEX "Note_expiresAt_idx" ON "Note"("expiresAt");
