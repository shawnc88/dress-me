import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { Layout } from '@/components/layout/Layout';
import { SubscribeTierSheet } from '@/components/subscription/SubscribeTierSheet';
import { ShareProfileButton } from '@/components/ui/ShareProfileButton';
import { GraduationCap, Radio, CalendarClock, Loader2, ArrowLeft, Lock, Play, UserPlus } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SITE_URL = 'https://bewithme.live';

interface OgClass {
  title: string;
  teacher: string;
  scheduledFor: string | null;
  avatarUrl: string | null;
  isClass: boolean;
}

function ClassHead({ og, id }: { og: OgClass | null; id: string }) {
  if (!og) return <Head><title>Class - Be With Me</title></Head>;
  const url = `${SITE_URL}/class/${id}`;
  const title = `${og.title} — ${og.isClass ? 'live class with' : 'live with'} ${og.teacher} | Be With Me`;
  const when = og.scheduledFor
    ? new Date(og.scheduledFor).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  const desc = when
    ? `Join ${og.teacher} live on BeWithMe — ${when}.`
    : `Join ${og.teacher} live on BeWithMe.`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BeWithMe Live" />
      {og.avatarUrl && <meta property="og:image" content={og.avatarUrl} />}
      <meta name="twitter:card" content="summary" />
    </Head>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = String(ctx.params?.id || '');
  let og: OgClass | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_URL}/api/streams/${encodeURIComponent(id)}`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const s = data?.stream;
      if (s) {
        const avatar = s.creator?.user?.avatarUrl;
        og = {
          title: s.title || 'Live stream',
          teacher: s.creator?.user?.displayName || s.creator?.user?.username || 'a creator',
          scheduledFor: s.scheduledFor || null,
          avatarUrl: typeof avatar === 'string' && avatar.startsWith('http') ? avatar : null,
          isClass: s.category === 'education',
        };
      }
    }
  } catch {}
  return { props: { og } };
};

export default function ClassPage({ og }: { og: OgClass | null }) {
  const router = useRouter();
  const { id } = router.query;
  const [stream, setStream] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    fetchWithTimeout(`${API_URL}/api/streams/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then(r => { if (!r.ok) throw new Error('Class not found'); return r.json(); })
      .then(data => {
        if (cancelled) return;
        setStream(data.stream);
        // Server withholds playback info on gated streams for non-members.
        setHasAccess(data.stream.streamType === 'PUBLIC' || !!data.playbackUrl);

        const username = data.stream?.creator?.user?.username;
        if (username) {
          fetchWithTimeout(`${API_URL}/api/users/profile/${username}`)
            .then(r => (r.ok ? r.json() : null))
            .then(p => {
              if (cancelled || !p) return;
              setTeacher(p.user);
              setReels((p.reels || []).slice(0, 6));
            })
            .catch(() => {});
        }
      })
      .catch(() => { if (!cancelled) setStream(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  // While scheduled, watch for the go-live moment — the Join button appears
  // in place without the visitor having to refresh.
  useEffect(() => {
    if (!stream || stream.status !== 'SCHEDULED') return;
    const poll = setInterval(() => {
      fetchWithTimeout(`${API_URL}/api/streams/${stream.id}/status`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d?.streamStatus && d.streamStatus !== 'SCHEDULED') {
            setStream((s: any) => ({ ...s, status: d.streamStatus }));
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(poll);
  }, [stream?.id, stream?.status]);

  if (loading) {
    return (
      <Layout>
        <ClassHead og={og} id={String(id || '')} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!stream) {
    return (
      <Layout>
        <Head><title>Class Not Found - Be With Me</title></Head>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-white/60 text-sm">This class doesn&apos;t exist or was removed.</p>
          <Link href="/classes" className="btn-couture-ghost min-h-[44px] !py-2.5 text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> All classes
          </Link>
        </div>
      </Layout>
    );
  }

  const isLive = stream.status === 'LIVE';
  const isScheduled = stream.status === 'SCHEDULED';
  const isClass = stream.category === 'education';
  const gated = stream.streamType !== 'PUBLIC';
  const teacherName = stream.creator?.user?.displayName || stream.creator?.user?.username || 'Teacher';
  const teacherUsername = stream.creator?.user?.username;
  const when = stream.scheduledFor
    ? new Date(stream.scheduledFor).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <Layout>
      <ClassHead
        og={{
          title: stream.title,
          teacher: teacherName,
          scheduledFor: stream.scheduledFor || null,
          avatarUrl: og?.avatarUrl || null,
          isClass,
        }}
        id={String(id)}
      />

      <div className="min-h-screen celebration-canvas safe-area-pb">
        <div className="max-w-[630px] mx-auto px-4 py-6 pb-24">

          {/* ─── Class hero ─── */}
          <div className="relative overflow-hidden celebration-canvas rounded-3xl border border-white/10 px-5 py-6 mb-5 animate-rise">
            <div className="pointer-events-none absolute top-0 inset-x-6 h-px neon-hairline opacity-60" aria-hidden />
            <div className="relative z-[2]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-cyan">
                  {isClass ? <GraduationCap className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                  {isClass ? 'Live class' : 'Live stream'}
                </span>
                {isLive ? (
                  <span className="px-2.5 py-1 rounded-full bg-live text-white text-[11px] font-bold flex items-center gap-1 shadow-glow">
                    <Radio className="w-3 h-3 animate-pulse" /> LIVE NOW
                  </span>
                ) : isScheduled && when ? (
                  <span className="px-2.5 py-1 rounded-full bg-black/50 border border-accent-cyan/30 text-accent-cyan text-[11px] font-bold flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> {when}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/40 text-[11px] font-bold">Ended</span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight mb-1.5">{stream.title}</h1>
              {stream.description && <p className="text-white/55 text-sm leading-relaxed">{stream.description}</p>}
              {gated && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-accent-amber">
                  <Lock className="w-3.5 h-3.5" /> {isClass ? 'Members-only class' : 'Members-only stream'}
                </p>
              )}
            </div>
          </div>

          {/* ─── Primary CTA ─── */}
          <div className="mb-5 flex gap-2.5">
            {isLive && (hasAccess ? (
              <Link
                href={`/stream/${stream.id}`}
                className="flex-1 min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2 no-select"
              >
                <Play className="w-4 h-4" /> {isClass ? 'Join the class' : 'Join the stream'}
              </Link>
            ) : (
              <button
                onClick={() => setShowSubscribe(true)}
                className="flex-1 min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2 no-select"
              >
                <Lock className="w-4 h-4" /> Become a member to join
              </button>
            ))}
            {isScheduled && teacherUsername && (
              <Link
                href={`/profile/${teacherUsername}`}
                className="flex-1 min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2 no-select"
              >
                <UserPlus className="w-4 h-4" /> Follow {teacherName} to get notified
              </Link>
            )}
            <ShareProfileButton
              username={teacherUsername || ''}
              displayName={teacherName}
              url={`${SITE_URL}/class/${stream.id}`}
              shareTitle={`${stream.title} — ${isClass ? 'live class with' : 'live with'} ${teacherName}`}
              className="w-12 min-h-[48px] rounded-full bg-white/[0.05] border border-white/15 flex items-center justify-center flex-shrink-0 text-white/70 hover:text-white transition-colors"
            />
          </div>

          {/* ─── Teacher card — the passerby's window into who this is ─── */}
          {teacherUsername && (
            <Link href={`/profile/${teacherUsername}`} className="block glass-card !rounded-3xl p-4 mb-5 hover:brightness-110 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-dark flex-shrink-0 border border-white/10">
                  {(teacher?.avatarUrl || stream.creator?.user?.avatarUrl) ? (
                    <img src={teacher?.avatarUrl || stream.creator?.user?.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500/25 to-accent-violet/25 flex items-center justify-center text-white font-bold text-lg">
                      {teacherName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{teacherName}</p>
                  <p className="text-white/40 text-xs truncate">
                    @{teacherUsername}
                    {typeof teacher?.followerCount === 'number' && ` · ${teacher.followerCount} follower${teacher.followerCount === 1 ? '' : 's'}`}
                  </p>
                  {teacher?.bio && <p className="text-white/50 text-xs mt-1 line-clamp-2">{teacher.bio}</p>}
                </div>
                <span className="text-brand-400 text-xs font-bold flex-shrink-0">View →</span>
              </div>
            </Link>
          )}

          {/* ─── A taste of their content ─── */}
          {reels.length > 0 && (
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-3">
                More from {teacherName}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {reels.map((r: any) => {
                  const thumb = r.thumbnailUrl
                    || (r.muxPlaybackId ? `https://image.mux.com/${r.muxPlaybackId}/thumbnail.jpg?width=360&fit_mode=smartcrop` : null);
                  return (
                    <Link key={r.id} href={`/reels/${r.id}`} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-ink-800 to-ink-950 hover:brightness-110 transition-all">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {stream.creatorId && (
        <SubscribeTierSheet
          creatorId={stream.creatorId}
          creatorName={teacherName}
          isOpen={showSubscribe}
          onClose={() => setShowSubscribe(false)}
        />
      )}
    </Layout>
  );
}
