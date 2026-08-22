-- Library music on reels: replaces original audio at playback (TikTok semantics)
ALTER TABLE "Reel" ADD COLUMN "musicTrackUrl" TEXT;
ALTER TABLE "Reel" ADD COLUMN "musicTrackTitle" TEXT;
