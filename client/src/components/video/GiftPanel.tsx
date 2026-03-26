import { useState } from 'react';

const GIFTS = [
  { id: 'heart', emoji: '❤️', name: 'Heart', threads: 10 },
  { id: 'fire', emoji: '🔥', name: 'Fire', threads: 50 },
  { id: 'crown', emoji: '👑', name: 'Crown', threads: 100 },
  { id: 'diamond', emoji: '💎', name: 'Diamond', threads: 500 },
  { id: 'dress', emoji: '👗', name: 'Dress', threads: 1000 },
  { id: 'star', emoji: '⭐', name: 'Star', threads: 2000 },
];

export function GiftPanel({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendGift = async () => {
    const gift = GIFTS.find((g) => g.id === selected);
    if (!gift) return;

    setSending(true);
    try {
      const res = await fetch('/api/threads/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          giftType: gift.id,
          threads: gift.threads,
          message: message || undefined,
        }),
      });
      if (res.ok) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to send gift:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card mt-4 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Send a Gift</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
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
            <div className="text-3xl mb-1">{gift.emoji}</div>
            <div className="text-xs font-medium">{gift.name}</div>
            <div className="text-xs text-brand-600">🧵 {gift.threads}</div>
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

      <button
        onClick={sendGift}
        disabled={!selected || sending}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending...' : selected ? `Send ${GIFTS.find((g) => g.id === selected)?.emoji} Gift` : 'Select a gift'}
      </button>
    </div>
  );
}
