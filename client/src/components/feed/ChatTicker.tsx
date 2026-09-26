import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// The single most important feed addition: a silent live thumbnail reads
// dead; three strangers talking reads like a room worth entering. Mount ONLY
// on the ACTIVE live card — it polls, so one instance at a time.
interface TickerMsg {
  id: string;
  type: string;
  name: string;
  text: string;
}

export function ChatTicker({ streamId }: { streamId: string }) {
  const [msgs, setMsgs] = useState<TickerMsg[]>([]);

  useEffect(() => {
    let cancelled = false;
    setMsgs([]);
    function load() {
      fetch(`${API_URL}/api/streams/${streamId}/chat-preview`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled && d?.messages) setMsgs(d.messages); })
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [streamId]);

  if (msgs.length === 0) return null;

  return (
    <div className="mb-2.5 space-y-1 pointer-events-none" aria-hidden>
      <AnimatePresence initial={false}>
        {msgs.slice(-3).map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex max-w-[85%] items-baseline gap-1.5 rounded-full bg-ink-950/45 backdrop-blur-sm px-3 py-1.5"
            style={{ display: 'flex', width: 'fit-content' }}
          >
            <span className={`text-[12px] font-bold flex-shrink-0 ${m.type === 'GIFT' ? 'text-accent-amber' : 'text-accent-cyan/90'}`}>
              {m.name}
            </span>
            <span className="text-white/80 text-[12px] leading-snug truncate">
              {m.type === 'GIFT' ? '🎁 ' : ''}{m.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
