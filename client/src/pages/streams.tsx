import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { CreatorCard } from '@/components/ui/CreatorCard';
import { TiltCard } from '@/components/3d/couture/TiltCard';
import { Radio, Calendar, Archive, Play } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';

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
    emptyTitle: 'No one is live right now',
    emptySub: 'Someone always goes live — check back in a few.',
  },
  SCHEDULED: {
    label: 'Scheduled',
    icon: Calendar,
    emptyTitle: 'Nothing scheduled yet',
    emptySub: 'Upcoming streams will show up right here.',
  },
  ARCHIVED: {
    label: 'Archive',
    icon: Archive,
    emptyTitle: 'No replays yet',
    emptySub: 'Past streams land here once they wrap.',
  },
};

export default function Streams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [tab, setTab] = useState<Tab>('LIVE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchWithTimeout(`${API_URL}/api/streams?status=${tab}&limit=50`)
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
        {/* ─── Celebration header — CSS color, no ambient 3D ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-6 pt-7 pb-6 mb-5" style={{ animationDelay: '1.5s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-brand-500/50 via-accent-violet/50 to-accent-cyan/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-end justify-between gap-4">
            <div className="animate-rise">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-2">
                Who&apos;s live
              </p>
              <h1 className="font-extrabold tracking-tight text-4xl text-white leading-[1.02]">
                Live <span className="text-celebration">now</span>
              </h1>
              <p className="text-white/50 text-sm mt-2.5 max-w-[240px]">
                Creators going live right now — jump in and join the party.
              </p>
            </div>
            <Link
              href="/feed"
              className="glimmer overflow-hidden btn-couture !px-5 !py-0 h-11 min-h-[44px] flex-shrink-0 flex items-center gap-1.5 text-xs no-select"
            >
              <Play className="w-3.5 h-3.5" fill="white" />
              Watch Feed
            </Link>
          </div>
        </div>

        {/* ─── Tabs — glass rail, lit active pill ─── */}
        <div className="glimmer overflow-hidden flex gap-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl p-1 mb-6 shadow-couture no-select">
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
                    className="absolute inset-0 rounded-full bg-white/[0.09] border border-white/20"
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
                        : t === 'SCHEDULED'
                          ? active
                            ? 'text-accent-blue'
                            : ''
                          : active
                            ? 'text-accent-violet'
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
                <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-cyan/25 to-transparent" />
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
            {/* CSS-only celebration orb — no WebGL on this view */}
            <div className="relative w-24 h-24 mx-auto mb-7 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-2xl animate-glow-breathe" />
              <div className="absolute inset-3 rounded-full neon-hairline flex items-center justify-center animate-float">
                <EmptyIcon className="w-7 h-7 text-accent-cyan" />
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">{meta.emptyTitle}</h2>
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
