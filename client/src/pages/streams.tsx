import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { CreatorCard } from '@/components/ui/CreatorCard';
import { TiltCard } from '@/components/3d/couture/TiltCard';
import { AtmosphereSection } from '@/components/3d/couture/AtmosphereSection';
import { Radio, Calendar, Archive, Play } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  scheduledFor: string | null;
  muxPlaybackId: string | null;
  creator: {
    category?: string;
    user: { username: string; displayName: string; avatarUrl: string | null };
  };
}

type Tab = 'LIVE' | 'SCHEDULED' | 'ARCHIVED';

const TAB_META: Record<
  Tab,
  { label: string; icon: typeof Radio; emptyTitle: string; emptySub: string }
> = {
  LIVE: {
    label: 'Live',
    icon: Radio,
    emptyTitle: 'The salon is quiet',
    emptySub: 'No one is live right now — the next look is moments away.',
  },
  SCHEDULED: {
    label: 'Scheduled',
    icon: Calendar,
    emptyTitle: 'Nothing on the calendar',
    emptySub: 'No upcoming streams yet. The invitations go out soon.',
  },
  ARCHIVED: {
    label: 'Archive',
    icon: Archive,
    emptyTitle: 'No encores yet',
    emptySub: 'Past shows will live here once the curtain falls.',
  },
};

export default function Streams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [tab, setTab] = useState<Tab>('LIVE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/streams?status=${tab}&limit=50`)
      .then((r) => r.json())
      .then((data) => setStreams(data.streams || []))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const meta = TAB_META[tab];
  const EmptyIcon = meta.icon;

  return (
    <Layout>
      <Head>
        <title>Browse Streams - Be With Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb">
        {/* ─── Couture header — the one 3D scene on this view ─── */}
        <AtmosphereSection
          grain
          intensity="subtle"
          className="rounded-4xl border border-white/10 shadow-couture px-6 pt-7 pb-6 mb-5"
        >
          <div className="relative z-[2] flex items-end justify-between gap-4">
            <div className="animate-rise">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-300/70 mb-2">
                Discover
              </p>
              <h1 className="editorial text-4xl text-white leading-[1.02]">
                Tonight&apos;s{' '}
                <span className="text-couture-gold">runway</span>
              </h1>
              <p className="text-white/50 text-sm mt-2.5 max-w-[240px]">
                Live fashion, up close — from the creators who set the tone.
              </p>
            </div>
            <Link
              href="/feed"
              className="btn-couture !px-5 !py-0 h-11 min-h-[44px] flex-shrink-0 flex items-center gap-1.5 text-xs no-select"
            >
              <Play className="w-3.5 h-3.5" fill="white" />
              Watch Feed
            </Link>
          </div>
        </AtmosphereSection>

        {/* ─── Tabs — glass rail, gold-lit active pill ─── */}
        <div className="flex gap-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl p-1 mb-6 shadow-couture no-select">
          {(['LIVE', 'SCHEDULED', 'ARCHIVED'] as Tab[]).map((t) => {
            const Icon = TAB_META[t].icon;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 h-11 min-h-[44px] rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  active
                    ? 'text-white'
                    : 'text-white/45 hover:text-white/75'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="streams-tab-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white/[0.09] border border-gold-300/30 shadow-gold-sm"
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon
                    className={`w-3 h-3 ${
                      t === 'LIVE'
                        ? active
                          ? 'text-live'
                          : 'text-live/60'
                        : active
                          ? 'text-gold-300'
                          : ''
                    }`}
                  />
                  {TAB_META[t].label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Stream grid ─── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="relative aspect-[9/16] rounded-4xl overflow-hidden bg-white/[0.03] border border-white/[0.07] animate-pulse"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold-300/25 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
                  <div className="h-2.5 w-3/4 rounded-full bg-white/[0.06]" />
                  <div className="h-2 w-1/2 rounded-full bg-white/[0.05]" />
                </div>
              </div>
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="glass-couture px-8 py-14 text-center animate-rise">
            {/* CSS-only couture orb — aurora above already owns this view's 3D */}
            <div className="relative w-24 h-24 mx-auto mb-7 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full bg-gold-300/20 blur-2xl animate-glow-breathe" />
              <div className="absolute inset-3 rounded-full gold-hairline flex items-center justify-center animate-float">
                <EmptyIcon className="w-7 h-7 text-gold-300" />
              </div>
            </div>
            <h2 className="editorial text-2xl text-white mb-2">{meta.emptyTitle}</h2>
            <p className="text-white/45 text-sm max-w-[260px] mx-auto leading-relaxed">
              {meta.emptySub}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {streams.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <TiltCard intensity="subtle">
                  <CreatorCard
                    streamId={stream.id}
                    title={stream.title}
                    creatorName={stream.creator.user.displayName}
                    creatorUsername={stream.creator.user.username}
                    avatarUrl={stream.creator.user.avatarUrl}
                    muxPlaybackId={stream.muxPlaybackId}
                    isLive={stream.status === 'LIVE'}
                    viewerCount={stream.viewerCount}
                    streamType={stream.streamType}
                    category={stream.creator.category}
                  />
                </TiltCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
