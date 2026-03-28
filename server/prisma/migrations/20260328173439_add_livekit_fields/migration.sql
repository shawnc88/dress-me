-- AlterTable
ALTER TABLE "Stream" ADD COLUMN     "ingestMode" TEXT NOT NULL DEFAULT 'rtmp',
ADD COLUMN     "livekitEgressId" TEXT,
ADD COLUMN     "livekitRoomName" TEXT;
