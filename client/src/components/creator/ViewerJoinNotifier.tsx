import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useViewerJoins, ViewerJoinEvent } from '@/hooks/useViewerJoins';

interface ViewerJoinNotifierProps {
  streamId: string | undefined;
  /** Milliseconds each toast stays on screen before auto-dismissing. */
  toastDurationMs?: number;
  /** Max number of concurrent toasts shown stacked. */
  maxConcurrentToasts?: number;
}

/**
 * Creator-facing UI that surfaces realtime viewer joins during a live stream.
 *
 * Renders two things:
 *   1) A stack of auto-dismissing toast cards (top-right on desktop, top-center on mobile).
 *   2) A compact collapsed "Recent Joins" panel inline (render where desired via RecentJoinsPanel export).
 *
 * Safe to render when `streamId` is undefined — hook short-circuits.
 */
export function ViewerJoinNotifier({
  streamId,
  toastDurationMs = 4500,
  maxConcurrentToasts = 3,
}: ViewerJoinNotifierProps) {
  const { latestJoin } = useViewerJoins(streamId);
  const [toasts, setToasts] = useState<ViewerJoinEvent[]>([]);

  useEffect(() => {
    if (!latestJoin) return;
    setToasts((prev) => [latestJoin, ...prev].slice(0, maxConcurrentToasts));

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.localId !== latestJoin.localId));
    }, toastDurationMs);

    return () => clearTimeout(timer);
  }, [latestJoin, toastDurationMs, maxConcurrentToasts]);

  if (!streamId) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 left-4 sm:left-auto sm:w-80 z-50 flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.localId}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto rounded-2xl bg-gradient-to-r from-violet-500/90 to-brand-500/90 backdrop-blur-xl border border-white/15 shadow-xl p-3 flex items-center gap-3"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
              {t.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserPlus className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-bold truncate">
                {t.user.displayName || t.user.username}
              </div>
              <div className="text-white/80 text-xs">joined your live</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline panel that shows the last N joins — render inside the go-live side
 * column so creators can scan who has arrived during the stream.
 */
export function RecentJoinsPanel({ streamId }: { streamId: string | undefined }) {
  const { recentJoins } = useViewerJoins(streamId);

  if (!streamId) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-violet-400" />
        <span className="text-white text-xs font-bold tracking-wider uppercase">Recent Joins</span>
        {recentJoins.length > 0 && (
          <span className="ml-auto text-white/50 text-xs">{recentJoins.length}</span>
        )}
      </div>
      {recentJoins.length === 0 ? (
        <div className="text-white/40 text-xs">No one has joined yet.</div>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {recentJoins.map((j) => (
            <li key={j.localId} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {j.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserPlus className="w-3 h-3 text-white/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white text-xs font-semibold truncate">
                  {j.user.displayName || j.user.username}
                </div>
                <div className="text-white/40 text-[10px]">{timeAgo(j.at)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
