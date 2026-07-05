import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Gift, Trophy, Ticket, Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  prizeDetails: string;
  prizeValueUsd: number;
  amoeMethod: string;
  eligibility: string;
  status: string;
  startDate: string;
  endDate: string;
  creator: {
    user: { username: string; displayName: string };
  };
  _count: { entries: number };
}

export default function Giveaways() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/giveaways`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((data) => setGiveaways(data.giveaways || []))
      .catch(() => setGiveaways([]))
      .finally(() => setLoading(false));
  }, []);

  async function enterGiveaway(id: string) {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Please log in to enter giveaways');
      return;
    }

    setEntering(id);
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/giveaways/${id}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryMethod: 'amoe' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Entry failed');

      setMessage('You have been entered! Good luck!');
      // Refresh to update entry count
      const refreshRes = await fetch(`${API_URL}/api/giveaways`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setGiveaways(refreshData.giveaways || []);
      }
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setEntering(null);
    }
  }

  return (
    <Layout>
      <Head>
        <title>Giveaways - Be With Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-24 safe-area-pb">
        {/* ─── Celebration hero — prizes are a party ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-6 pt-10 pb-9 mb-10 text-center" style={{ animationDelay: '2.5s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-accent-amber/60 via-brand-500/60 to-accent-magenta/60"
            aria-hidden
          />
          {/* CSS-only prize glow — no WebGL */}
          <div
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full gradient-celebration opacity-20 blur-3xl"
            aria-hidden
          />
          <div className="relative z-[2] animate-rise">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-amber/90 mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" aria-hidden />
              Prizes dropping
              <Sparkles className="w-3 h-3" aria-hidden />
            </p>
            <h1 className="font-extrabold tracking-tight text-4xl md:text-5xl text-white leading-[1.02] mb-4">
              Win <span className="text-celebration">big</span>
            </h1>
            <p className="text-white/55 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Join the party — entry is always free, no purchase necessary. Every giveaway
              includes a free alternative method of entry (AMOE).
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`max-w-lg mx-auto mb-8 px-5 py-3.5 rounded-2xl text-sm text-center font-medium backdrop-blur-xl border animate-rise ${
              message.includes('entered') || message.includes('luck')
                ? 'bg-accent-green/10 border-accent-green/30 text-accent-green shadow-glow-green'
                : 'bg-live/10 border-live/30 text-red-300'
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="glass-couture px-8 py-20 text-center">
            {/* Breathing celebration orb — no bare spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-2xl animate-glow-breathe" />
              <div className="absolute inset-3 rounded-full neon-hairline flex items-center justify-center animate-float">
                <Gift className="w-6 h-6 text-accent-amber" />
              </div>
            </div>
            <p className="text-white/45 text-sm">Loading giveaways...</p>
          </div>
        ) : giveaways.length === 0 ? (
          <div className="glass-couture px-8 py-16 text-center animate-rise">
            <div className="relative w-24 h-24 mx-auto mb-7 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-2xl animate-glow-breathe" />
              <div className="absolute inset-3 rounded-full neon-hairline flex items-center justify-center animate-float">
                <Gift className="w-7 h-7 text-accent-amber" />
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              No prizes dropping right now
            </h2>
            <p className="text-white/45 text-sm max-w-[280px] mx-auto leading-relaxed">
              Follow your favorite creators — you&apos;ll be first to know when the next one lands.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {giveaways.map((g, i) => (
              <div key={g.id} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <GiveawayCard
                  giveaway={g}
                  onEnter={() => enterGiveaway(g.id)}
                  isEntering={entering === g.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="mt-16 px-6 py-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-center">
          <p className="text-xs text-white/40 leading-relaxed max-w-2xl mx-auto">
            NO PURCHASE NECESSARY TO ENTER OR WIN. A purchase does not improve your chances of winning.
            All giveaways are subject to official rules available on each giveaway&apos;s detail page.
            Must meet eligibility requirements. Void where prohibited by law.
          </p>
          <Link
            href="/giveaway-rules"
            className="inline-flex items-center justify-center min-h-[44px] px-4 mt-1 text-xs font-semibold text-accent-amber/80 hover:text-accent-amber transition-colors"
          >
            Read the full giveaway rules
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function GiveawayCard({
  giveaway,
  onEnter,
  isEntering,
}: {
  giveaway: Giveaway;
  onEnter: () => void;
  isEntering: boolean;
}) {
  const endDate = new Date(giveaway.endDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const prizeValue = (giveaway.prizeValueUsd / 100).toFixed(0);

  return (
    <div className="glass-couture !rounded-4xl overflow-hidden border border-accent-amber/20 shadow-glow-amber transition-all duration-300 hover:border-accent-amber/40">
      {/* Prize Banner — warm reward heat: amber → orange → pink */}
      <div className="relative bg-gradient-to-br from-accent-amber/25 via-accent-orange/20 to-brand-500/25 p-6 text-white overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-yellow/70 via-accent-amber/70 to-brand-500/70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent-amber/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-accent-amber/15 border border-accent-amber/40 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-accent-amber" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight mb-1">{giveaway.title}</h2>
            <p className="text-white/60 text-sm">by {giveaway.creator.user.displayName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-accent-yellow to-accent-orange">
              ${prizeValue}
            </p>
            <p className="text-accent-amber/70 text-[11px] font-semibold uppercase tracking-[0.18em] mt-0.5">
              prize value
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        <p className="text-sm text-white/60 leading-relaxed">{giveaway.description}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-accent-amber font-bold">Prize:</span>
            <span className="text-white/60">{giveaway.prizeDetails}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-400 font-bold">Eligibility:</span>
            <span className="text-white/60">{giveaway.eligibility}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 py-3 border-t border-white/[0.08]">
          <div>
            <p className="text-lg font-extrabold text-accent-magenta">{giveaway._count.entries}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">entries</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-accent-orange">{daysLeft}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">days left</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Ends</p>
            <p className="text-sm font-medium text-white/75">
              {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Free Entry */}
        <div className="rounded-2xl p-4 bg-accent-green/[0.08] border border-accent-green/25">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-green mb-1.5 flex items-center gap-1.5">
            <Ticket className="w-3 h-3" aria-hidden />
            Free entry method (AMOE)
          </p>
          <p className="text-xs text-white/60 leading-relaxed">{giveaway.amoeMethod}</p>
        </div>

        {/* Enter Button */}
        <button
          onClick={onEnter}
          disabled={isEntering}
          className="glimmer w-full min-h-[48px] rounded-full overflow-hidden bg-gradient-to-r from-brand-500 via-accent-magenta to-accent-orange text-white text-sm font-bold uppercase tracking-[0.14em] px-6 py-3.5 shadow-glow-magenta hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 no-select"
        >
          {isEntering ? 'Entering...' : 'Enter Free — I’m In'}
        </button>
      </div>
    </div>
  );
}
