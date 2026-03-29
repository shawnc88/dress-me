import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Winner {
  userId: string;
  username?: string;
  displayName?: string;
  tier: string;
  rank: number;
}

interface RafflePanelProps {
  streamId: string;
  token: string;
}

export function RafflePanel({ streamId, token }: RafflePanelProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [maxWinners, setMaxWinners] = useState(1);
  const [closesInMinutes, setClosesInMinutes] = useState(5);
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');

  const [raffleId, setRaffleId] = useState<string | null>(null);
  const [raffleStatus, setRaffleStatus] = useState<string>('');
  const [winners, setWinners] = useState<Winner[]>([]);

  async function createRaffle() {
    if (!title.trim()) return;
    setCreating(true);
    setError('');

    try {
      const closesAt = new Date(Date.now() + closesInMinutes * 60 * 1000).toISOString();
      const res = await fetch(`${API_URL}/api/raffle/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          closesAt,
          maxWinners,
          tierWeights: { BASIC: 1, PREMIUM: 3, ELITE: 10 },
          streamId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create raffle');

      setRaffleId(data.raffleId);
      setRaffleStatus('OPEN');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function drawWinners() {
    if (!raffleId) return;
    setDrawing(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/raffle/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ raffleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to draw winners');

      setWinners(data.winners);
      setRaffleStatus('DRAWN');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDrawing(false);
    }
  }

  function reset() {
    setRaffleId(null);
    setRaffleStatus('');
    setWinners([]);
    setTitle('');
    setMaxWinners(1);
    setError('');
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
      >
        Raffle
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Raffle</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">
          Close
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Create form */}
      {!raffleId && (
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Raffle title (e.g., VIP Giveaway)"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Winners</label>
              <input
                type="number"
                value={maxWinners}
                onChange={(e) => setMaxWinners(Math.max(1, Number(e.target.value)))}
                min={1}
                max={100}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Closes in (min)</label>
              <input
                type="number"
                value={closesInMinutes}
                onChange={(e) => setClosesInMinutes(Math.max(1, Number(e.target.value)))}
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Tier weights: Basic 1x, Premium 3x, Elite 10x
          </div>
          <button
            onClick={createRaffle}
            disabled={creating || !title.trim()}
            className="w-full py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Raffle'}
          </button>
        </div>
      )}

      {/* Active raffle */}
      {raffleId && raffleStatus === 'OPEN' && (
        <div className="space-y-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Raffle is open!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Eligible subscribers are automatically entered.
            </p>
          </div>
          <button
            onClick={drawWinners}
            disabled={drawing}
            className="w-full py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
          >
            {drawing ? 'Drawing...' : 'Draw Winners'}
          </button>
        </div>
      )}

      {/* Winners */}
      {raffleStatus === 'DRAWN' && (
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Winners drawn!
            </p>
          </div>
          {winners.length > 0 ? (
            <ol className="space-y-1">
              {winners.map((w) => (
                <li key={w.rank} className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-purple-600 w-5">#{w.rank}</span>
                  <span>{w.displayName || w.username || w.userId.slice(0, 8)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                    {w.tier}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500">No eligible subscribers found.</p>
          )}
          <button
            onClick={reset}
            className="w-full py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            New Raffle
          </button>
        </div>
      )}
    </div>
  );
}
