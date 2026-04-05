import { useRouter } from 'next/router';
import { useState, useEffect, Component, ReactNode } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Crown, ArrowRight, Star, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/utils/api';

const MultiGuestLiveLayout = dynamic(
  () => import('@/components/suite/MultiGuestLiveLayout'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin mb-2" />
        <p className="text-white/40 text-sm">Loading Suite...</p>
      </div>
    ),
  }
);

/** Error boundary to catch LiveKit rendering crashes */
class SuiteErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean; error?: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
          <h2 className="text-white text-lg font-bold mb-2">Suite Failed to Load</h2>
          <p className="text-white/40 text-sm text-center mb-2">
            Camera or microphone access may be required.
          </p>
          <p className="text-white/20 text-[10px] text-center mb-6 max-w-xs">
            {this.state.error}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={this.props.onError}
            className="px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-bold"
          >
            Return to Stream
          </motion.button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SuitePage() {
  const router = useRouter();
  const { streamId, token: qToken, wsUrl: qWsUrl, room: qRoom, role: qRole } = router.query;

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'host' | 'selected_guest' | 'audience'>('selected_guest');
  const [loading, setLoading] = useState(true);
  const [suiteEnded, setSuiteEnded] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;

    // Step 1: Request camera/mic permissions BEFORE connecting to LiveKit
    async function requestPermissions(): Promise<boolean> {
      const incomingRole = (qRole as string) || 'selected_guest';
      if (incomingRole === 'audience') return true; // audience doesn't need cam/mic

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Immediately stop tracks — LiveKit will create its own
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch (err: any) {
        console.error('[Suite] Permission denied:', err);
        setPermissionError(
          err.name === 'NotAllowedError'
            ? 'Camera and microphone access are required to join Suite. Please allow access and try again.'
            : err.name === 'NotFoundError'
              ? 'No camera or microphone found on this device.'
              : `Device error: ${err.message}`
        );
        setLoading(false);
        return false;
      }
    }

    async function init() {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      if (qToken && qWsUrl && qRoom) {
        const wsUrlStr = qWsUrl as string;
        if (!wsUrlStr || wsUrlStr === 'undefined' || !wsUrlStr.startsWith('wss://')) {
          alert('Suite connection failed — invalid server URL. Please try again.');
          router.back();
          return;
        }
        setToken(qToken as string);
        setWsUrl(wsUrlStr);
        setRoom(qRoom as string);
        setRole((qRole as any) || 'selected_guest');
        setLoading(false);
        return;
      }

      // No params in URL — fetch token from API
      try {
        const data = await apiFetch(`/api/streams/${streamId}/suite/join-token`, {
          method: 'POST',
        });
        if (!data.wsUrl || !data.wsUrl.startsWith('wss://')) {
          throw new Error('Suite server not available. Please try again later.');
        }
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

    init();
  }, [streamId, qToken, qWsUrl, qRoom, qRole, router]);

  // Permission denied screen
  if (permissionError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8">
        <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
        <h2 className="text-white text-lg font-bold mb-2 text-center">Camera & Mic Required</h2>
        <p className="text-white/50 text-sm text-center mb-6 max-w-xs">{permissionError}</p>
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setPermissionError(null); setLoading(true); }}
            className="px-6 py-3 rounded-xl bg-violet-500 text-white text-sm font-bold"
          >
            Try Again
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(streamId ? `/stream/${streamId}` : '/')}
            className="px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-bold"
          >
            Return to Stream
          </motion.button>
        </div>
      </div>
    );
  }

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
        <Head><title>Suite Ended - Be With Me</title></Head>
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
      <Head><title>Be With Me Suite</title></Head>
      <SuiteErrorBoundary onError={() => router.push(streamId ? `/stream/${streamId}` : '/')}>
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
      </SuiteErrorBoundary>
    </>
  );
}
