import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flower2, Crown, Diamond, Shirt, Star, Send, Coins, Plus, PartyPopper } from 'lucide-react';
import { BuyCoinsModal } from '@/components/payment/BuyCoinsModal';
import { haptic } from '@/utils/native';
import { track } from '@/lib/analytics';

const COMBO_WINDOW_MS = 5000;

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

const GIFTS: (GiftDef & { badge?: string })[] = [
  { id: 'heart', icon: <Heart className="w-7 h-7" />, emoji: '❤️', color: 'text-red-400', bg: 'bg-red-500/10', name: 'Heart', threads: 1, effect: 'float' },
  { id: 'rose', icon: <Flower2 className="w-7 h-7" />, emoji: '🌹', color: 'text-rose-400', bg: 'bg-rose-500/10', name: 'Rose', threads: 10, effect: 'float' },
  { id: 'outfit', icon: <Shirt className="w-7 h-7" />, emoji: '👗', color: 'text-brand-400', bg: 'bg-brand-500/10', name: 'Outfit', threads: 50, effect: 'burst', badge: 'Popular' },
  { id: 'spotlight', icon: <Star className="w-7 h-7" />, emoji: '🔥', color: 'text-amber-400', bg: 'bg-amber-500/10', name: 'Spotlight', threads: 200, effect: 'spotlight', badge: 'Best Value' },
  { id: 'fireworks', icon: <PartyPopper className="w-7 h-7" />, emoji: '🎆', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', name: 'Fireworks', threads: 300, effect: 'spotlight', badge: 'Statement' },
  { id: 'crown', icon: <Crown className="w-7 h-7" />, emoji: '👑', color: 'text-yellow-400', bg: 'bg-yellow-500/10', name: 'VIP Crown', threads: 500, effect: 'fullscreen', badge: 'VIP' },
  { id: 'diamond', icon: <Diamond className="w-7 h-7" />, emoji: '💎', color: 'text-cyan-400', bg: 'bg-cyan-500/10', name: 'Diamond', threads: 1000, effect: 'fullscreen', badge: 'Top Supporter' },
];

export function GiftPanel({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Combo: the panel STAYS OPEN after a send and the button escalates
  // ("Send again ×2 ×3…") inside a rolling window — repeat gifting is the
  // core behavior, the old auto-close+1s debounce actively suppressed it.
  const [combo, setCombo] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSendRef = useRef(0);

  // Fan club: 3 gifts to this creator unlocks a one-tap join (badge + list).
  const creatorIdRef = useRef<string | null>(null);
  const [club, setClub] = useState<{
    member: boolean; eligible: boolean; giftCount: number; count: number; threshold: number;
  } | null>(null);
  const [joiningClub, setJoiningClub] = useState(false);

  const refreshClub = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      if (!creatorIdRef.current) {
        const sr = await fetch(`${API_URL}/api/streams/${streamId}`);
        const sd = sr.ok ? await sr.json() : null;
        creatorIdRef.current = sd?.stream?.creatorId || sd?.stream?.creator?.id || null;
      }
      if (!creatorIdRef.current) return;
      const r = await fetch(`${API_URL}/api/fan-club/${creatorIdRef.current}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setClub(await r.json());
    } catch {}
  }, [streamId]);

  useEffect(() => { refreshClub(); }, [refreshClub]);

  async function joinClub() {
    const token = localStorage.getItem('token');
    if (!token || !creatorIdRef.current) return;
    setJoiningClub(true);
    try {
      const r = await fetch(`${API_URL}/api/fan-club/${creatorIdRef.current}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        haptic('heavy');
        await refreshClub();
      }
    } catch {}
    setJoiningClub(false);
  }

  const sendGift = useCallback(async () => {
    const gift = GIFTS.find((g) => g.id === selected);
    if (!gift) return;

    // Just enough debounce to stop accidental double-fires
    const now = Date.now();
    if (now - lastSendRef.current < 250) return;
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

      // The gift broadcast is emitted server-side from POST /api/threads/gift
      // (threads.ts) to everyone in the room — no client socket needed here.

      track('gift_sent', { streamId, giftType: gift.id, threads: gift.threads });
      haptic(combo >= 4 ? 'heavy' : combo >= 1 ? 'medium' : 'light');
      setCombo(c => c + 1);
      setBursts(b => [...b.slice(-4), Date.now()]);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => setCombo(0), COMBO_WINDOW_MS);
      // Fan-club progress moves with every send
      refreshClub();
    } catch (err: any) {
      setError(err.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  }, [selected, streamId, combo, refreshClub]);

  // Changing gifts ends the combo run
  useEffect(() => { setCombo(0); }, [selected]);
  useEffect(() => () => { if (comboTimerRef.current) clearTimeout(comboTimerRef.current); }, []);

  const selectedGift = GIFTS.find(g => g.id === selected);

  return (
    <div className="space-y-4 relative">
      {/* Floating send bursts — feedback without ever blocking the next send */}
      <AnimatePresence>
        {selectedGift && bursts.map(id => (
          <motion.div
            key={id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -70, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 text-3xl pointer-events-none z-10"
          >
            {selectedGift.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {(
        <>
          {/* Balance + Buy Coins */}
          <BalanceBar />

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
                {(gift as any).badge && (
                  <div className="absolute -top-1.5 right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-[11px] font-bold text-white leading-none">
                    {(gift as any).badge}
                  </div>
                )}
                <div className={`flex justify-center mb-1.5 ${gift.color}`}>{gift.icon}</div>
                <div className="text-xs font-semibold text-white">{gift.name}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400">{gift.threads}</span>
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

          {/* Send button — escalates into a combo button inside the window */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={sendGift}
            disabled={!selected}
            className={`w-full min-h-[52px] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              !selected
                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                : combo > 0
                  ? 'gradient-celebration text-white shadow-glow-lg animate-glow-breathe'
                  : 'bg-brand-500 text-white shadow-glow hover:bg-brand-600'
            }`}
          >
            {!selected ? (
              'Select a gift'
            ) : combo > 0 ? (
              <>
                <span className="text-lg leading-none">{selectedGift?.emoji}</span>
                Send again ×{combo + 1}
                {combo >= 4 && <span aria-hidden>🔥</span>}
              </>
            ) : sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {selectedGift?.name} ({selectedGift?.threads} coins)
              </>
            )}
          </motion.button>
          {combo > 0 && (
            <p className="text-secondary text-[11px] text-center -mt-2">
              Combo ×{combo} · keep tapping!
            </p>
          )}

          {/* ─── Fan club — coordinated gifting starts here ─── */}
          {club && !club.member && (club.eligible || club.giftCount > 0) && (
            <div className="rounded-2xl bg-brand-500/[0.08] border border-brand-400/25 px-3.5 py-3">
              {club.eligible ? (
                <button
                  onClick={joinClub}
                  disabled={joiningClub}
                  className="w-full min-h-[44px] rounded-full bg-brand-500/20 border border-brand-400/50 text-brand-200 text-[13px] font-bold flex items-center justify-center gap-1.5 no-select disabled:opacity-50"
                >
                  ⚡ {joiningClub ? 'Joining…' : `Join the fan club${club.count ? ` · ${club.count} member${club.count === 1 ? '' : 's'}` : ''}`}
                </button>
              ) : (
                <p className="text-tertiary text-[11px] text-center font-semibold">
                  ⚡ {club.threshold - club.giftCount} more gift{club.threshold - club.giftCount === 1 ? '' : 's'} unlocks the fan club — badge + member list
                </p>
              )}
            </div>
          )}
          {club?.member && (
            <p className="text-brand-300 text-[11px] text-center font-bold">
              ⚡ Fan club member — your gifts rep the club
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BalanceBar() {
  const [balance, setBalance] = useState<number | null>(null);
  const [showBuy, setShowBuy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/threads/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBalance(d.balance); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-white text-sm font-bold">{balance !== null ? balance.toLocaleString() : '...'}</span>
          <span className="text-decorative text-xs">threads</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowBuy(true)}
          className="flex items-center gap-1 px-4 min-h-[44px] rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold"
        >
          <Plus className="w-3 h-3" /> Buy
        </motion.button>
      </div>
      <BuyCoinsModal
        open={showBuy}
        onClose={() => setShowBuy(false)}
        currentBalance={balance || 0}
        onPurchased={(newBal) => setBalance(newBal)}
      />
    </>
  );
}
