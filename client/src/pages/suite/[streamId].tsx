import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '@/utils/api';

const MultiGuestLiveLayout = dynamic(
  () => import('@/components/suite/MultiGuestLiveLayout').then(m => m.MultiGuestLiveLayout),
  { ssr: false }
);

export default function SuitePage() {
  const router = useRouter();
  const { streamId, token: qToken, wsUrl: qWsUrl, room: qRoom, role: qRole } = router.query;

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'host' | 'selected_guest' | 'audience'>('selected_guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamId) return;

    // If token passed via query params (from invite accept)
    if (qToken && qWsUrl && qRoom) {
      setToken(qToken as string);
      setWsUrl(qWsUrl as string);
      setRoom(qRoom as string);
      setRole((qRole as any) || 'selected_guest');
      setLoading(false);
      return;
    }

    // Otherwise fetch join token from API
    async function getToken() {
      try {
        const data = await apiFetch(`/api/streams/${streamId}/suite/join-token`, {
          method: 'POST',
        });
        setToken(data.token);
        setWsUrl(data.wsUrl);
        setRoom(data.room);
        setRole(data.role);
      } catch (err: any) {
        alert(err.message || 'Failed to join Suite');
        router.back();
      } finally {
        setLoading(false);
      }
    }

    getToken();
  }, [streamId, qToken, qWsUrl, qRoom, qRole, router]);

  if (loading || !token || !wsUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-violet-400 animate-pulse" />
        </div>
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin mb-2" />
        <p className="text-white/40 text-sm">Connecting to Suite...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>Dress Me Suite</title></Head>
      <MultiGuestLiveLayout
        token={token}
        wsUrl={wsUrl}
        role={role}
        onLeave={() => router.push(streamId ? `/stream/${streamId}` : '/')}
        suiteId={room || ''}
        streamId={streamId as string}
      />
    </>
  );
}
