import { useEffect, useRef, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useViewerPresence(streamId: string | undefined) {
  const [viewerCount, setViewerCount] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Join stream
  useEffect(() => {
    if (!streamId) return;

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_URL}/api/engagement/${streamId}/join`, {
      method: 'POST',
      headers,
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.sessionId) {
          sessionIdRef.current = data.sessionId;
        }
      })
      .catch(() => {});

    // Heartbeat every 15 seconds
    pingIntervalRef.current = setInterval(() => {
      if (!sessionIdRef.current) return;
      fetch(`${API_URL}/api/engagement/${streamId}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
    }, 15000);

    // Poll viewer count every 10 seconds
    const fetchCount = () => {
      fetch(`${API_URL}/api/engagement/${streamId}/viewer-count`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setViewerCount(data.count); })
        .catch(() => {});
    };
    fetchCount();
    countIntervalRef.current = setInterval(fetchCount, 10000);

    // Leave on unmount
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (sessionIdRef.current) {
        navigator.sendBeacon(
          `${API_URL}/api/engagement/${streamId}/leave`,
          JSON.stringify({ sessionId: sessionIdRef.current }),
        );
      }
    };
  }, [streamId]);

  return { viewerCount };
}
