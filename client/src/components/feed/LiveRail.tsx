import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Plus, Clock } from 'lucide-react';
import { StoryBubble } from '@/features/stories/StoryBubble';
import { StoryViewer } from '@/features/stories/StoryViewer';
import { getStoredUser } from '@/utils/authUser';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── The Live Rail ────────────────────────────────────────────────
// The "someone is live RIGHT NOW" signal at the top of Home:
// [Go Live] → live (most viewers first, animated ring + count) →
// scheduled-tonight (clock badge) → stories. Tap a live ring goes
// STRAIGHT into the room — no intermediate screen, ever.

interface RailStream {
  id: string;
  title: string;
  status: string;
  viewerCount: number;
  scheduledFor?: string | null;
  creator?: { user?: { username?: string; displayName?: string; avatarUrl?: string | null } };
}

interface StoryGroup {
  creatorId: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string };
  stories: Array<{ id: string; mediaUrl: string; mediaType: string; caption?: string; createdAt: string; expiresAt: string; viewCount: number }>;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const h = d.getHours();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  const mins = d.getMinutes();
  const t = mins ? `${hh}:${String(mins).padStart(2, '0')}${ampm}` : `${hh}${ampm}`;
  if (d.toDateString() === now.toDateString()) return t;
  return `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${t}`;
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-accent-violet/30 flex items-center justify-center text-white font-bold text-lg">
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export function LiveRail() {
  const router = useRouter();
  const [live, setLive] = useState<RailStream[]>([]);
  const [scheduled, setScheduled] = useState<RailStream[]>([]);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [me] = useState(() => getStoredUser());
  const isCreator = me?.role === 'CREATOR' || me?.role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`${API_URL}/api/streams?status=LIVE&limit=20`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled || !d?.streams) return;
          setLive([...d.streams].sort((a: RailStream, b: RailStream) => (b.viewerCount || 0) - (a.viewerCount || 0)));
        })
        .catch(() => {});
      fetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled || !d?.streams) return;
          // Next 24h only — "tonight", not a distant calendar.
          const dayOut = Date.now() + 24 * 60 * 60 * 1000;
          setScheduled(
            (d.streams as RailStream[]).filter(s => s.scheduledFor && new Date(s.scheduledFor).getTime() < dayOut)
          );
        })
        .catch(() => {});
      fetch(`${API_URL}/api/stories`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled && d?.storyGroups) setGroups(d.storyGroups); })
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Creators live right now shouldn't ALSO show as story bubbles.
  const liveCreatorIds = new Set(live.map(s => s.creator?.user?.username));
  const storyGroups = groups.filter(g => !liveCreatorIds.has(g.user.username));

  if (!isCreator && live.length === 0 && scheduled.length === 0 && storyGroups.length === 0) return null;

  return (
    <>
      <div className="flex items-start gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Go Live — creating is one tap from the home screen */}
        {isCreator && (
          <button onClick={() => router.push('/go-live')} className="flex flex-col items-center gap-1.5 flex-shrink-0 no-select w-[64px]">
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-white/25 flex items-center justify-center bg-white/[0.04]">
              <div className="w-9 h-9 rounded-full bg-brand-500 shadow-glow flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-micro text-secondary leading-tight">Go Live</span>
          </button>
        )}

        {/* Live now — animated ring, viewer count, straight into the room */}
        {live.map(s => {
          const u = s.creator?.user;
          return (
            <button key={s.id} onClick={() => router.push(`/stream/${s.id}`)} className="flex flex-col items-center gap-1.5 flex-shrink-0 no-select w-[64px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-live via-brand-500 to-accent-magenta animate-pulse-live">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-ink-950">
                    <Avatar url={u?.avatarUrl} name={u?.displayName || u?.username || '?'} />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full bg-live text-white text-[11px] font-extrabold uppercase tracking-wide leading-tight border border-ink-950">
                  Live
                </span>
                {(s.viewerCount || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-px rounded-full bg-ink-950/85 border border-white/20 text-white text-[11px] font-bold leading-tight">
                    {s.viewerCount}
                  </span>
                )}
              </div>
              <span className="text-micro text-primary leading-tight truncate w-full text-center normal-case tracking-normal">
                {u?.displayName || u?.username}
              </span>
            </button>
          );
        })}

        {/* Scheduled tonight — clock badge + time, tap → landing with RSVP */}
        {scheduled.map(s => {
          const u = s.creator?.user;
          return (
            <button key={s.id} onClick={() => router.push(`/class/${s.id}`)} className="flex flex-col items-center gap-1.5 flex-shrink-0 no-select w-[64px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-[2px] bg-white/15 opacity-80">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-ink-950">
                    <Avatar url={u?.avatarUrl} name={u?.displayName || u?.username || '?'} />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-px rounded-full bg-ink-800 border border-white/20 text-accent-cyan text-[11px] font-bold leading-tight whitespace-nowrap">
                  <Clock className="w-2.5 h-2.5" /> {s.scheduledFor ? timeLabel(s.scheduledFor) : 'soon'}
                </span>
              </div>
              <span className="text-micro text-tertiary leading-tight truncate w-full text-center normal-case tracking-normal">
                {u?.displayName || u?.username}
              </span>
            </button>
          );
        })}

        {/* Stories */}
        {storyGroups.map((group, i) => (
          <StoryBubble
            key={group.creatorId}
            username={group.user.username}
            displayName={group.user.displayName}
            avatarUrl={group.user.avatarUrl}
            hasUnviewed={true}
            onClick={() => setViewerIndex(i)}
          />
        ))}
      </div>

      {viewerIndex !== null && (
        <StoryViewer groups={storyGroups} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </>
  );
}
