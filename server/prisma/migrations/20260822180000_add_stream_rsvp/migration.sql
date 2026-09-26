-- "I'm going" RSVPs on scheduled streams/classes
CREATE TABLE "StreamRsvp" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamRsvp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StreamRsvp_streamId_userId_key" ON "StreamRsvp"("streamId", "userId");
CREATE INDEX "StreamRsvp_streamId_idx" ON "StreamRsvp"("streamId");
