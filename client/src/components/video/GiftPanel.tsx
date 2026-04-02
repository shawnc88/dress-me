import { useState } from 'react';
import { Heart, Flame, Crown, Diamond, Shirt, Star, X, Send, Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const GIFTS: { id: string; icon: React.ReactNode; color: string; name: string; threads: number }[] = [
  { id: 'heart', icon: <Heart className="w-6 h-6" />, color: 'text-red-500', name: 'Heart', threads: 10 },
  { id: 'fire', icon: <Flame className="w-6 h-6" />, color: 'text-orange-500', name: 'Fire', threads: 50 },
  { id: 'crown', icon: <Crown className="w-6 h-6" />, color: 'text-yellow-500', name: 'Crown', threads: 100 },
  { id: 'diamond', icon: <Diamond className="w-6 h-6" />, color: 'text-cyan-500', name: 'Diamond', threads: 500 },
  { id: 'dress', icon: <Shirt className="w-6 h-6" />, color: 'text-brand-500', name: 'Dress', threads: 1000 },
  { id: 'star', icon: <Star className="w-6 h-6" />, color: 'text-amber-500', name: 'Star', threads: 2000 },
];

export function GiftPanel({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const sendGift = async () => {
    const gift = GIFTS.find((g) => g.id === selected);
    if (!gift) return;

    setSending(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/api/threads/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          streamId,
          giftType: gift.id,
          threads: gift.threads,
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to send gift (${res.status})`);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card mt-4 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Send a Gift</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {GIFTS.map((gift) => (
          <button
            key={gift.id}
            onClick={() => setSelected(gift.id)}
            className={`p-4 rounded-xl border-2 text-center transition-all ${
              selected === gift.id
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
            }`}
          >
            <div className={`flex justify-center mb-1 ${gift.color}`}>{gift.icon}</div>
            <div className="text-xs font-medium">{gift.name}</div>
            <div className="text-xs text-brand-600">
              <Sparkles className="w-3 h-3 inline mr-0.5 text-brand-500" /> {gift.threads}
            </div>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message (optional)"
        maxLength={200}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 text-sm mb-4
                   focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {error && (
        <p className="text-red-500 text-xs mb-2 text-center">{error}</p>
      )}

      <button
        onClick={sendGift}
        disabled={!selected || sending}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending...' : selected ? <><Send className="w-4 h-4 mr-1 inline" />Send {GIFTS.find((g) => g.id === selected)?.name} Gift</> : 'Select a gift'}
      </button>
    </div>
  );
}
