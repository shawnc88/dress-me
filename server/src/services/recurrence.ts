import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { createMuxLiveStream, isMuxConfigured } from './streaming/mux';

// ─── Recurring shows ─────────────────────────────────────────────
// A creator sets a show up ONCE ("every Thursday 9pm") and the platform
// keeps it standing:
//  - When the show ENDS after airing → a fresh SCHEDULED instance is created
//    one week after the previous slot, RSVPs carried over (an RSVP is a
//    standing reservation — those fans get next week's T-15 push too).
//  - When a show is MISSED (never went live, >2h stale) → the same row just
//    rolls forward a week, keeping its Mux ingest and RSVPs intact.

function nextWeeklySlot(from: Date): Date {
  const next = new Date(from);
  do {
    next.setDate(next.getDate() + 7);
  } while (next.getTime() < Date.now());
  return next;
}

/** Called after a stream transitions to ENDED. No-op unless recurring. */
export async function rollRecurringShow(streamId: string): Promise<void> {
  try {
    const ended = await prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true, creatorId: true, title: true, description: true, category: true,
        streamType: true, scheduledFor: true, recurrenceRule: true, status: true,
      },
    });
    if (!ended || ended.recurrenceRule !== 'weekly' || !ended.scheduledFor) return;
    if (!isMuxConfigured()) {
      logger.warn(`recurrence: Mux not configured — cannot roll show ${streamId}`);
      return;
    }

    // Guard: don't create a duplicate if this end-event fires twice
    const nextSlot = nextWeeklySlot(ended.scheduledFor);
    const existing = await prisma.stream.findFirst({
      where: {
        creatorId: ended.creatorId,
        title: ended.title,
        status: 'SCHEDULED',
        recurrenceRule: 'weekly',
        scheduledFor: { gte: new Date() },
      },
    });
    if (existing) return;

    const mux = await createMuxLiveStream(ended.title, 'low', 60);
    const next = await prisma.stream.create({
      data: {
        creatorId: ended.creatorId,
        title: ended.title,
        description: ended.description,
        category: ended.category,
        streamType: ended.streamType,
        scheduledFor: nextSlot,
        recurrenceRule: 'weekly',
        muxStreamId: mux.muxStreamId,
        muxPlaybackId: mux.playbackId,
        muxStreamKey: mux.streamKey,
        ingestMode: 'rtmp',
      },
    });

    // Carry the audience: last week's RSVPs are next week's front row.
    const rsvps = await prisma.streamRsvp.findMany({
      where: { streamId: ended.id },
      select: { userId: true },
    });
    if (rsvps.length) {
      await prisma.streamRsvp.createMany({
        data: rsvps.map(r => ({ streamId: next.id, userId: r.userId })),
        skipDuplicates: true,
      });
    }
    logger.info(`recurrence: rolled "${ended.title}" → ${next.id} @ ${nextSlot.toISOString()} (${rsvps.length} RSVPs carried)`);
  } catch (err: any) {
    logger.error(`recurrence: roll failed for ${streamId}: ${err?.message || err}`);
  }
}

/** 5-min sweep: a recurring show that never aired rolls forward in place. */
export async function bumpMissedRecurringShows(): Promise<void> {
  const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const missed = await prisma.stream.findMany({
    where: { status: 'SCHEDULED', recurrenceRule: 'weekly', scheduledFor: { lt: staleBefore } },
    select: { id: true, title: true, scheduledFor: true },
  });
  for (const s of missed) {
    const nextSlot = nextWeeklySlot(s.scheduledFor!);
    await prisma.stream.update({ where: { id: s.id }, data: { scheduledFor: nextSlot } });
    logger.info(`recurrence: missed "${s.title}" bumped to ${nextSlot.toISOString()}`);
  }
}
