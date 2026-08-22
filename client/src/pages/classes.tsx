import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { GraduationCap, Radio, CalendarClock, Loader2, Sparkles } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ClassStream {
  id: string;
  title: string;
  status: string;
  scheduledFor: string | null;
  viewerCount: number;
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  creator: { username?: string; displayName?: string; avatarUrl?: string };
}

function classTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today · ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

function ClassCard({ s }: { s: ClassStream }) {
  const thumb = s.thumbnailUrl
    || (s.muxPlaybackId ? `https://image.mux.com/${s.muxPlaybackId}/thumbnail.jpg?width=640&fit_mode=smartcrop` : null);
  const live = s.status === 'LIVE';
  return (
    <Link href={`/class/${s.id}`} className="block glass-card !rounded-3xl overflow-hidden hover:brightness-110 transition-all">
      <div className="relative aspect-video bg-gradient-to-br from-ink-800 to-ink-950">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white/15" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          {live ? (
            <span className="px-2.5 py-1 rounded-full bg-live text-white text-[11px] font-bold flex items-center gap-1 shadow-glow">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-accent-cyan/30 text-accent-cyan text-[11px] font-bold flex items-center gap-1">
              <CalendarClock className="w-3 h-3" /> {s.scheduledFor ? classTime(s.scheduledFor) : 'Soon'}
            </span>
          )}
        </div>
      </div>
      <div className="p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-dark flex-shrink-0 border border-white/10">
          {s.creator.avatarUrl ? (
            <img src={s.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500/25 to-accent-violet/25 flex items-center justify-center text-white font-bold text-sm">
              {(s.creator.displayName || '?').charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{s.title}</p>
          <p className="text-white/40 text-xs truncate">{s.creator.displayName || s.creator.username}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Classes() {
  const [live, setLive] = useState<ClassStream[]>([]);
  const [upcoming, setUpcoming] = useState<ClassStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithTimeout(`${API_URL}/api/search/explore?category=education`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const streams: ClassStream[] = data?.streams || [];
        setLive(streams.filter(s => s.status === 'LIVE'));
        // Scheduled classes need a real future-ish time — go-live drafts
        // (SCHEDULED with no scheduledFor) and long-stale rows are noise here.
        const cutoff = Date.now() - 2 * 60 * 60 * 1000;
        setUpcoming(
          streams
            .filter(s => s.status === 'SCHEDULED' && s.scheduledFor && new Date(s.scheduledFor).getTime() > cutoff)
            .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <Head><title>Classes - Be With Me</title></Head>

      <div className="min-h-screen celebration-canvas safe-area-pb">
        <div className="max-w-[630px] mx-auto px-4 py-6 pb-24">

          {/* Header */}
          <div className="relative overflow-hidden celebration-canvas rounded-3xl border border-white/10 px-5 py-4 mb-6 animate-rise">
            <div className="pointer-events-none absolute top-0 inset-x-6 h-px neon-hairline opacity-60" aria-hidden />
            <div className="relative z-[2] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center shadow-glow-cyan flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-accent-cyan" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                  Live <span className="text-celebration">classes</span>
                </h1>
                <p className="text-white/40 text-xs mt-0.5">Learn with a teacher, in real time</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <div className="mb-7">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-3 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-live" /> Happening now
                  </h2>
                  <div className="grid gap-4">{live.map(s => <ClassCard key={s.id} s={s} />)}</div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div className="mb-7">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-3 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-accent-cyan" /> Upcoming
                  </h2>
                  <div className="grid gap-4">{upcoming.map(s => <ClassCard key={s.id} s={s} />)}</div>
                </div>
              )}

              {live.length === 0 && upcoming.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <GraduationCap className="w-9 h-9 text-white/20 mx-auto mb-3" />
                  <p className="text-white font-bold mb-1">No classes on the calendar yet</p>
                  <p className="text-white/40 text-sm">Check back soon — or be the first to teach one.</p>
                </div>
              )}

              {/* Teach CTA — creators land on go-live, everyone else sees the invitation */}
              <Link
                href="/dashboard/go-live"
                className="mt-2 flex items-center justify-between glass-card !rounded-2xl px-4 py-3.5 border !border-brand-500/25 hover:!border-brand-400/50 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <Sparkles className="w-4 h-4 text-brand-400" /> Know something worth teaching?
                </span>
                <span className="text-brand-400 text-sm font-bold flex-shrink-0 ml-3">Schedule a class →</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
