import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, Crown, Diamond, Shirt, Star, Send, Coins } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GiftDef {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
  bg: string;
  name: string;
  threads: number;
  effect: 'float' | 'burst' | 'spotlight' | 'fullscreen';
}

const GIFTS: GiftDef[] = [
  { id: 'heart', icon: <Heart className="w-7 h-7" />, emoji: '❤️', color: 'text-red-400', bg: 'bg-red-500/10', name: 'Heart', threads: 1, effect: 'float' },
  { id: 'rose', icon: <Flame className="w-7 h-7" />, emoji: '🌹', color: 'text-rose-400', bg: 'bg-rose-500/10', name: 'Rose', threads: 10, effect: 'float' },
  { id: 'outfit', icon: <Shirt className="w-7 h-7" />, emoji: '👗', color: 'text-brand-400', bg: 'bg-brand-500/10', name: 'Outfit', threads: 50, effect: 'burst' },
  { id: 'spotlight', icon: <Star className="w-7 h-7" />, emoji: '🔥', color: 'text-amber-400', bg: 'bg-amber-500/10', name: 'Spotlight', threads: 200, effect: 'spotlight' },
  { id: 'crown', icon: <Crown className="w-7 h-7" />, emoji: '👑', color: 'text-yellow-400', bg: 'bg-yellow-500/10', name: 'VIP Crown', threads: 500, effect: 'fullscreen' },
  { id: 'diamond', icon: <Diamond className="w-7 h-7" />, emoji: '💎', color: 'text-cyan-400', bg: 'bg-cyan-500/10', name: 'Diamond', threads: 1000, effect: 'fullscreen' },
];

export function GiftPanel({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const lastSendRef = useRef(0);

  const sendGift = useCallback(async () => {
    const gift = GIFTS.find((g) => g.id === selected);
    if (!gift) return;

    // Debounce: 1 second between sends
    const now = Date.now();
    if (now - lastSendRef.current < 1000) return;
    lastSendRef.current = now;

    setSending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in to send gifts');

      const res = await fetch(`${API_URL}/api/threads/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          streamId,
          giftType: gift.id,
          threads: gift.threads,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to send gift');
      }

      // Emit Socket.IO event so gift animation broadcasts to all viewers
      try {
        const socket = io(API_URL, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => {
          socket.emit('join-stream', { streamId });
          socket.emit('gift-sent', { streamId, giftType: gift.id, threads: gift.threads });
          setTimeout(() => socket.disconnect(), 2000);
        });
      } catch {}

      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  }, [selected, streamId, onClose]);

  const selectedGift = GIFTS.find(g => g.id === selected);

  return (
    <div className="space-y-4">
      {/* Success animation */}
      <AnimatePresence>
        {sent && selectedGift && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              {selectedGift.emoji}
            </motion.div>
            <p className="text-white font-bold">Gift Sent!</p>
            <p className="text-gray-500 text-sm">{selectedGift.name} sent to creator</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!sent && (
        <>
          {/* Gift grid */}
          <div className="grid grid-cols-3 gap-2">
            {GIFTS.map((gift) => (
              <motion.button
                key={gift.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelected(gift.id)}
                className={`relative p-4 rounded-2xl border text-center transition-all ${
                  selected === gift.id
                    ? `${gift.bg} border-white/20 shadow-glow-sm`
                    : 'border-white/5 bg-white/3 hover:bg-white/5'
                }`}
              >
                <div className={`flex justify-center mb-1.5 ${gift.color}`}>{gift.icon}</div>
                <div className="text-xs font-semibold text-white">{gift.name}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400">{gift.threads}</span>
                </div>
                {selected === gift.id && (
                  <motion.div
                    layoutId="gift-selected"
                    className="absolute inset-0 rounded-2xl border-2 border-brand-500 pointer-events-none"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-live text-xs text-center bg-live/10 rounded-xl py-2"
            >
              {error}
            </motion.p>
          )}

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendGift}
            disabled={!selected || sending}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              selected
                ? 'bg-brand-500 text-white shadow-glow hover:bg-brand-600'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : selected ? (
              <>
                <Send className="w-4 h-4" />
                Send {selectedGift?.name} ({selectedGift?.threads} coins)
              </>
            ) : (
              'Select a gift'
            )}
          </motion.button>
        </>
      )}
    </div>
  );
}
