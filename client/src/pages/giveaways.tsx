import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Gift, Trophy } from 'lucide-react';

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
        <title>Giveaways - Dress Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-3">Active Giveaways</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Enter for free — no purchase necessary. Every giveaway includes a free alternative method of entry (AMOE).
          </p>
        </div>

        {message && (
          <div className={`max-w-lg mx-auto mb-8 px-4 py-3 rounded-lg text-sm text-center ${
            message.includes('entered') || message.includes('luck')
              ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading giveaways...</div>
        ) : giveaways.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No active giveaways right now</p>
            <p className="text-gray-400 text-sm">Follow your favorite creators to get notified!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {giveaways.map((g) => (
              <GiveawayCard
                key={g.id}
                giveaway={g}
                onEnter={() => enterGiveaway(g.id)}
                isEntering={entering === g.id}
              />
            ))}
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="mt-16 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl text-center">
          <p className="text-xs text-gray-400 max-w-2xl mx-auto">
            NO PURCHASE NECESSARY TO ENTER OR WIN. A purchase does not improve your chances of winning.
            All giveaways are subject to official rules available on each giveaway&apos;s detail page.
            Must meet eligibility requirements. Void where prohibited by law.
          </p>
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
    <div className="card overflow-hidden">
      {/* Prize Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <Trophy className="w-8 h-8 text-white/90 mb-2" />
            <h2 className="text-xl font-bold mb-1">{giveaway.title}</h2>
            <p className="text-brand-100 text-sm">by {giveaway.creator.user.displayName}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">${prizeValue}</p>
            <p className="text-brand-200 text-xs">prize value</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{giveaway.description}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-500 font-bold">Prize:</span>
            <span className="text-gray-600 dark:text-gray-400">{giveaway.prizeDetails}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-500 font-bold">Eligibility:</span>
            <span className="text-gray-600 dark:text-gray-400">{giveaway.eligibility}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-lg font-bold">{giveaway._count.entries}</p>
            <p className="text-xs text-gray-400">entries</p>
          </div>
          <div>
            <p className="text-lg font-bold">{daysLeft}</p>
            <p className="text-xs text-gray-400">days left</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400">Ends</p>
            <p className="text-sm font-medium">
              {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Free Entry */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">FREE ENTRY METHOD (AMOE)</p>
          <p className="text-xs text-green-600 dark:text-green-400">{giveaway.amoeMethod}</p>
        </div>

        {/* Enter Button */}
        <button
          onClick={onEnter}
          disabled={isEntering}
          className="btn-primary w-full text-center disabled:opacity-50"
        >
          {isEntering ? 'Entering...' : 'Enter Giveaway (Free)'}
        </button>
      </div>
    </div>
  );
}
