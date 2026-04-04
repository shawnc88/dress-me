import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Crown, ArrowRight, Star } from 'lucide-react';
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
  const [suiteEnded, setSuiteEnded] = useState(false);

  useEffect(() => {
    if (!streamId) return;

    if (qToken && qWsUrl && qRoom) {
      setToken(qToken as string);
      setWsUrl(qWsUrl as string);
      setRoom(qRoom as string);
      setRole((qRole as any) || 'selected_guest');
      setLoading(false);
      return;
    }

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

  // Post-Suite conversion screen
  if (suiteEnded && role !== 'host') {
    return (
      <>
        <Head><title>Suite Ended - Dress Me</title></Head>
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-amber-500/30 flex items-center justify-center mx-auto mb-5">
              <Star className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-white text-xl font-extrabold mb-2">Suite Session Ended</h2>
            <p className="text-white/50 text-sm mb-6">Thanks for joining! Want to get selected more often?</p>

            {/* Upgrade CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 p-5 mb-4 text-left"
            >
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-amber-300 text-sm font-bold">Upgrade to Inner Circle</span>
              </div>
              <div className="space-y-1.5 mb-4">
                <p className="text-white/50 text-xs flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" /> Highest priority for Suite Selection
                </p>
                <p className="text-white/50 text-xs flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" /> Exclusive drops & private sessions
                </p>
                <p className="text-white/50 text-xs flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" /> Elite badge & recognition
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(streamId ? `/stream/${streamId}` : '/')}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>

            <button
              onClick={() => router.push(streamId ? `/stream/${streamId}` : '/')}
              className="text-white/30 text-xs"
            >
              Return to stream
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Dress Me Suite</title></Head>
      <MultiGuestLiveLayout
        token={token}
        wsUrl={wsUrl}
        role={role}
        onLeave={() => {
          if (role !== 'host') {
            setSuiteEnded(true);
          } else {
            router.push(streamId ? `/stream/${streamId}` : '/');
          }
        }}
        suiteId={room || ''}
        streamId={streamId as string}
      />
    </>
  );
}
