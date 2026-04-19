import { useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket } from '@/utils/socket';

export interface ViewerJoinEvent {
  streamId: string;
  user: {
    id: string | null;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  at: string;
  isGuest?: boolean;
  // Local-only: used to animate in/out without React key collisions
  localId: string;
}

/**
 * Subscribes to realtime viewer:joined events for a stream and exposes:
 * - `recentJoins`: rolling list (most recent first, capped at `max`)
 * - `latestJoin`: the most recent event (useful for toast animations)
 *
 * Only visible to whoever has joined the stream's chat room — typically the
 * creator on go-live plus anyone watching.
 */
export function useViewerJoins(streamId: string | undefined, max = 10) {
  const [recentJoins, setRecentJoins] = useState<ViewerJoinEvent[]>([]);
  const [latestJoin, setLatestJoin] = useState<ViewerJoinEvent | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!streamId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = connectSocket(token);

    // Join the stream's chat room so server-emitted events reach this socket
    socket.emit('join-stream', streamId);

    function onJoin(payload: Omit<ViewerJoinEvent, 'localId'>) {
      if (payload.streamId !== streamId) return;

      // De-dupe within the same second (rare but possible with server retries)
      const dedupeKey = `${payload.user.id || 'guest'}:${payload.at}`;
      if (seenIdsRef.current.has(dedupeKey)) return;
      seenIdsRef.current.add(dedupeKey);

      const event: ViewerJoinEvent = {
        ...payload,
        localId: `${dedupeKey}:${Math.random().toString(36).slice(2, 8)}`,
      };

      setLatestJoin(event);
      setRecentJoins((prev) => [event, ...prev].slice(0, max));
    }

    function onLeave(_payload: { streamId: string; userId: string; at: string }) {
      // No UI for leaves right now — hook stub so server emits don't noop into void.
      // Reserved for future viewer-count drift fixes.
    }

    socket.on('viewer:joined', onJoin);
    socket.on('viewer:left', onLeave);

    return () => {
      socket.off('viewer:joined', onJoin);
      socket.off('viewer:left', onLeave);
    };
  }, [streamId, max]);

  return { recentJoins, latestJoin };
}
