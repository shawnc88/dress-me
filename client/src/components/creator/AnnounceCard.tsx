import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Send } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { haptic } from '@/utils/native';

// ─── The megaphone ───────────────────────────────────────────────
// One announcement a day to every follower + fan-club member — push and
// bell. "Special guest tonight 9pm 🔥" is how a scheduled room fills.

export function AnnounceCard() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    // JS validation only — never `required` attrs (WKWebView bubble rule).
    if (text.trim().length < 3) { setError('Say something first.'); return; }
    setSending(true);
    setError(null);
    try {
      const d = await apiFetch<{ sent: number; recipients: number }>('/api/creators/announce', {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      });
      haptic('medium');
      setResult(`Sent to ${d.sent} fan${d.sent === 1 ? '' : 's'} 📣`);
      setText('');
      setTimeout(() => { setOpen(false); setResult(null); }, 2500);
    } catch (e: any) {
      setError(e?.message || 'Could not send');
    }
    setSending(false);
  }

  return (
    <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-brand-400/25 p-4">
      <div
        className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent"
        aria-hidden
      />
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 text-left no-select min-h-[44px]">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-400/25 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold">Announce to your fans</p>
            <p className="text-tertiary text-[11px]">One a day · push + bell to everyone following you</p>
          </div>
        </button>
      ) : (
        <div className="space-y-2.5">
          <p className="text-brand-300/90 text-[11px] font-semibold uppercase tracking-[0.28em]">📣 Announcement</p>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value.slice(0, 200)); setError(null); }}
            placeholder="Special guest tonight 9pm 🔥"
            rows={2}
            autoFocus
            className="w-full rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white text-sm placeholder:text-decorative focus:outline-none focus:border-brand-400/50 resize-none"
          />
          {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          {result && <p className="text-accent-green text-xs font-bold">{result}</p>}
          <div className="flex items-center gap-2">
            <span className="text-decorative text-[11px] tabular-nums flex-1">{200 - text.length} left · sends once, today only</span>
            <button onClick={() => { setOpen(false); setText(''); setError(null); }} className="min-h-[44px] px-4 rounded-full bg-white/[0.05] border border-white/10 text-secondary text-[13px] font-semibold no-select">
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={send}
              disabled={sending || text.trim().length < 3}
              className="min-h-[44px] px-5 rounded-full bg-brand-500 text-white text-[13px] font-bold flex items-center gap-1.5 shadow-glow disabled:opacity-40 no-select"
            >
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
