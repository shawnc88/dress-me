import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/utils/api';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  createdAt: string;
}

/**
 * NotificationBanner — the native-style drop-down banner. New notifications
 * slide down from the top while the app is open; swipe UP to dismiss, tap to
 * jump to the thing (live room, conversation, profile). Mounted once in _app
 * so it works on every surface, including the fullscreen home feed.
 *
 * Polls the bell endpoint (25s) rather than adding a new socket channel — the
 * first successful fetch only sets the baseline so an old backlog never
 * replays as banners.
 */
export function NotificationBanner() {
  const router = useRouter();
  const [current, setCurrent] = useState<Notif | null>(null);
  const baselineRef = useRef<string | null>(null); // newest id we've already seen
  const queueRef = useRef<Notif[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stopped = false;

    function showNext() {
      if (stopped) return;
      const next = queueRef.current.shift();
      if (!next) return;
      setCurrent(next);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setCurrent(null);
        // brief gap between stacked banners
        setTimeout(showNext, 350);
      }, 5000);
    }

    async function poll() {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const d = await apiFetch<{ notifications: Notif[] }>('/api/notifications?limit=5');
        const items = d.notifications || [];
        if (items.length === 0) return;
        if (baselineRef.current === null) {
          // First fetch = baseline only; never banner the historical backlog.
          baselineRef.current = items[0].id;
          return;
        }
        const fresh: Notif[] = [];
        for (const n of items) {
          if (n.id === baselineRef.current) break;
          fresh.push(n);
        }
        if (fresh.length > 0) {
          baselineRef.current = items[0].id;
          queueRef.current.push(...fresh.reverse());
          if (!current) showNext();
        }
      } catch {
        // offline / cold backend — try again next tick
      }
    }

    poll();
    const iv = setInterval(poll, 25000);
    return () => {
      stopped = true;
      clearInterval(iv);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setCurrent(null);
  }

  function open(n: Notif) {
    dismiss();
    const d = n.data || {};
    if (n.type === 'stream_live' && d.streamId) router.push(`/stream/${d.streamId}`);
    else if (n.type === 'new_message' && d.conversationId) router.push(`/messages/${d.conversationId}`);
    else if (n.type === 'new_follower') router.push('/profile');
    else router.push('/notifications');
  }

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ y: -140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -140, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.9, bottom: 0.1 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -40 || info.velocity.y < -300) dismiss();
          }}
          className="fixed top-0 inset-x-0 z-[95] px-3 pt-3 safe-area-pt"
        >
          <button
            onClick={() => open(current)}
            className="w-full text-left rounded-3xl border border-white/12 bg-ink-900/90 backdrop-blur-2xl shadow-couture px-4 py-3.5 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-2 h-2 rounded-full gradient-celebration shadow-glow-cyan flex-shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-bold truncate">{current.title}</p>
                <p className="text-white/60 text-[13px] leading-snug line-clamp-2">{current.body}</p>
              </div>
            </div>
            {/* drag affordance */}
            <div className="flex justify-center mt-2">
              <span className="w-9 h-1 rounded-full bg-white/15" aria-hidden />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
