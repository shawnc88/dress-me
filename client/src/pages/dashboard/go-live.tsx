import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { DevicePreview } from '@/components/video/DevicePreview';
import { LiveStreamMetrics } from '@/components/ui/LiveStreamMetrics';
import { PartyPopper, ExternalLink, Radio, Sparkles, StopCircle, Crown, Users, Video } from 'lucide-react';
import { SuiteCandidateList } from '@/components/suite/SuiteCandidateList';
import { PostStreamSummaryCard } from '@/features/growth/PostStreamSummaryCard';
import { MoneyMomentPrompts } from '@/components/creator/MoneyMomentPrompts';
import { EarningsBreakdown } from '@/components/creator/EarningsBreakdown';
import { ViewerJoinNotifier, RecentJoinsPanel } from '@/components/creator/ViewerJoinNotifier';
import { GiftAnimationOverlay } from '@/components/ui/GiftAnimationOverlay';
import { HeartTapOverlay } from '@/components/ui/HeartTapOverlay';

const BrowserPublisher = dynamic(
  () => import('@/components/video/BrowserPublisher').then((m) => m.BrowserPublisher),
  { ssr: false },
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Step = 'form' | 'preview' | 'live' | 'ended';

export default function GoLive() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [ending, setEnding] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const [streamId, setStreamId] = useState('');
  const [streamCreatorId, setStreamCreatorId] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [livekitToken, setLivekitToken] = useState('');
  const [livekitWsUrl, setLivekitWsUrl] = useState('');
  const [streamStatus, setStreamStatus] = useState('idle');
  const [suiteOpen, setSuiteOpen] = useState(false);
  const [showSuiteCandidates, setShowSuiteCandidates] = useState(false);
  const [suiteMaxGuests, setSuiteMaxGuests] = useState(3);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/auth/login'); return; }
    setToken(t);
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setUser(data.user))
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Poll stream status when live
  useEffect(() => {
    if (!streamId || step === 'ended' || step === 'form') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/streams/${streamId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setStreamStatus(data.streamStatus);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [streamId, step]);

  async function createStream(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setCreating(true);
    setError('');

    try {
      // 1. Create Mux stream
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, ingestMode: 'rtmp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create stream');

      // 2. Get LiveKit publisher token
      const tokenRes = await fetch(`${API_URL}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ streamId: data.stream.id }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Failed to get camera access');

      setStreamId(data.stream.id);
      setStreamCreatorId(data.stream.creatorId);
      setStreamTitle(data.stream.title);
      setLivekitToken(tokenData.token);
      setLivekitWsUrl(tokenData.wsUrl);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function goLive() {
    setStep('live');
  }

  // Called by BrowserPublisher AFTER tracks are confirmed published + 5s propagation
  const handleTracksReady = useCallback(async () => {
    if (!token || !streamId) return;
    // debug removed
    try {
      const res = await fetch(`${API_URL}/api/streams/${streamId}/live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Go-live response received
      if (!res.ok) setError(data.error?.message || 'Failed to start stream');
    } catch (err: any) {
      setError(err.message);
    }
  }, [token, streamId]);

  async function endStream() {
    if (!token || !streamId || ending) return;
    setEnding(true);
    try {
      await fetch(`${API_URL}/api/streams/${streamId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch {}
    setEnding(false);
    setStep('ended');
  }

  function resetForm() {
    setStep('form');
    setStreamId('');
    setStreamTitle('');
    setLivekitToken('');
    setPreviewReady(false);
    setTitle('');
    setDescription('');
    setError('');
    setStreamStatus('idle');
  }

  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  }

  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  return (
    <Layout>
      <Head><title>Go Live - Be With Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb">
        {/* ─── Slim celebration header ─── */}
        <div className="relative overflow-hidden celebration-canvas rounded-3xl border border-white/10 px-5 py-4 mb-6">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-live/60 via-brand-500/50 to-accent-cyan/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center gap-3.5 animate-rise">
            <div className="w-11 h-11 rounded-full bg-live flex items-center justify-center shadow-glow-live flex-shrink-0">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                Go <span className="text-celebration">live</span>
              </h1>
              <p className="text-white/40 text-xs mt-0.5">Your people are waiting</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-live/10 backdrop-blur-xl border border-live/30 text-live px-4 py-3 rounded-2xl text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {/* Not a creator */}
        {!isCreator && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center">
            <Sparkles className="w-12 h-12 text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-2">Become a creator</h2>
            <p className="text-white/50 mb-6 text-sm">Set up your creator profile and go live for your people.</p>
            <button onClick={() => router.push('/become-creator')} className="px-7 min-h-[48px] rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all no-select">Start creator setup</button>
          </motion.div>
        )}

        {/* STEP 1: Title form */}
        {isCreator && step === 'form' && (
          <form onSubmit={createStream} className="glass-card p-6 space-y-5 animate-rise">
            <div className="bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan px-4 py-3 rounded-2xl text-sm font-medium">
              Stream straight from your camera. No extra apps needed!
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60 mb-2">Stream title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors"
                placeholder="e.g., Friday night hangout — come vibe" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/60 mb-2">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors resize-none"
                placeholder="Tell your people what to expect..." />
            </div>
            <button type="submit" disabled={creating || !title.trim()}
              className="w-full min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all disabled:opacity-50 no-select">
              {creating ? 'Setting up...' : 'Set up camera'}
            </button>
          </form>
        )}

        {/* STEP 2: Camera preview */}
        {isCreator && step === 'preview' && (
          <div className="space-y-5 animate-rise">
            <div className="glass-card border-accent-amber/25 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-amber/15 border border-accent-amber/25 flex items-center justify-center flex-shrink-0">
                <Radio className="w-4 h-4 text-accent-amber" />
              </div>
              <p className="text-accent-amber text-sm font-semibold">Check your camera and mic before going live</p>
            </div>
            <DevicePreview onReady={() => setPreviewReady(true)} onError={(msg) => setError(msg)} />
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 min-h-[48px] py-2.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/12 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors">Back</button>
              <button onClick={goLive} disabled={!previewReady}
                className="flex-[2] min-h-[48px] py-3 rounded-full bg-live text-white text-sm font-bold shadow-glow-live hover:brightness-110 transition-all disabled:opacity-50 disabled:shadow-none no-select">
                Go live now
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Broadcasting */}
        {isCreator && step === 'live' && (
          <div className="space-y-5">
            {/* Wrap video + overlays together so the overlays' absolute
                positioning lands on the actual video rectangle, not the
                whole page. Streamer now sees the same gift + heart
                animations their viewers see. */}
            <div className="relative">
              <BrowserPublisher
                token={livekitToken}
                wsUrl={livekitWsUrl}
                streamTitle={streamTitle}
                onTracksReady={handleTracksReady}
                onDisconnect={endStream}
              />
              {streamStatus === 'LIVE' && streamId && (
                <>
                  <GiftAnimationOverlay streamId={streamId} />
                  <HeartTapOverlay streamId={streamId} />
                </>
              )}
            </div>

            {streamStatus === 'LIVE' && (
              <>
                {/* Floating toast stack + inline panel for realtime viewer joins */}
                <ViewerJoinNotifier streamId={streamId} />

                <LiveStreamMetrics streamId={streamId} />

                <RecentJoinsPanel streamId={streamId} />

                {/* ─── Money Moment Prompts ─── */}
                <MoneyMomentPrompts streamId={streamId} />

                {/* ─── Suite Controls ─── */}
                {!suiteOpen ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={async () => {
                      try {
                        const t = localStorage.getItem('token');
                        const res = await fetch(`${API_URL}/api/streams/${streamId}/suite/open`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                          body: JSON.stringify({ maxGuests: 3, isPublic: false, minTier: 'SUPPORTER' }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setSuiteOpen(true);
                          setSuiteMaxGuests(data.suite?.maxGuests || 3);
                          setShowSuiteCandidates(true);
                        } else {
                          alert(data.error?.message || 'Failed to open Suite');
                        }
                      } catch (err: any) {
                        console.error('[Suite] Open failed:', err);
                        alert(`Failed to open Suite: ${err.message || 'network error'}`);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-brand-500/20 border border-violet-500/30 text-white text-sm font-bold flex items-center justify-center gap-2 hover:from-violet-500/30 hover:to-brand-500/30 transition-all"
                  >
                    <Video className="w-4 h-4 text-violet-400" /> Open Be With Me Suite
                  </motion.button>
                ) : (
                  <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-violet-400" />
                        <span className="text-violet-300 text-xs font-bold">Suite Active</span>
                      </div>
                      <button
                        onClick={() => setShowSuiteCandidates(!showSuiteCandidates)}
                        className="text-violet-400 text-[10px] font-medium"
                      >
                        {showSuiteCandidates ? 'Hide' : 'Show'} Candidates
                      </button>
                    </div>
                    {showSuiteCandidates && (
                      <SuiteCandidateList
                        streamId={streamId}
                        maxGuests={suiteMaxGuests}
                        onInvitesSent={async (ids) => {
                          setShowSuiteCandidates(false);
                          // Auto-join Suite as host after sending invites
                          try {
                            const t = localStorage.getItem('token');
                            const res = await fetch(`${API_URL}/api/streams/${streamId}/suite/join-token`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                            });
                            const data = await res.json();
                            if (data.token && data.wsUrl) {
                              const params = new URLSearchParams({
                                token: data.token,
                                wsUrl: data.wsUrl,
                                room: data.room,
                                role: data.role,
                              });
                              // Navigate in same tab — egress keeps stream live for viewers
                              window.location.href = `/suite/${streamId}?${params.toString()}`;
                            } else {
                              alert(data.error?.message || 'Failed to get Suite token');
                            }
                          } catch (err: any) {
                            console.error('[Suite] Auto-join after invite failed:', err);
                            alert(`Failed to join Suite: ${err.message || 'network error'}`);
                          }
                        }}
                      />
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          try {
                            const t = localStorage.getItem('token');
                            const res = await fetch(`${API_URL}/api/streams/${streamId}/suite/join-token`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                            });
                            const data = await res.json();
                            if (data.token && data.wsUrl) {
                              const params = new URLSearchParams({
                                token: data.token,
                                wsUrl: data.wsUrl,
                                room: data.room,
                                role: data.role,
                              });
                              // Navigate in same tab — egress keeps stream live for viewers
                              window.location.href = `/suite/${streamId}?${params.toString()}`;
                            } else {
                              alert(data.error?.message || 'Failed to get Suite token');
                            }
                          } catch (err: any) {
                            console.error('[Suite] Join as host failed:', err);
                            alert(`Failed to join Suite: ${err.message || 'network error'}`);
                          }
                        }}
                        className="flex-1 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" /> Join Suite as Host
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Close the Suite? Guests will be disconnected. Your stream will continue.')) return;
                          try {
                            const t = localStorage.getItem('token');
                            await fetch(`${API_URL}/api/streams/${streamId}/suite/end`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                            });
                            setSuiteOpen(false);
                            setShowSuiteCandidates(false);
                          } catch (err: any) {
                            console.error('[Suite] Close failed:', err);
                            alert(`Failed to close Suite: ${err.message || 'network error'}`);
                          }
                        }}
                        className="py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                      >
                        Close Suite
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => window.open(`/stream/${streamId}`, '_blank')}
                  className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold text-center inline-flex items-center justify-center gap-1">
                  View as Viewer <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 4: Ended — with post-stream summary */}
        {isCreator && step === 'ended' && (
          <div className="space-y-4 animate-rise">
            <div className="glass-card celebration-canvas p-6 text-center">
              <PartyPopper className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-lg font-extrabold tracking-tight text-white mb-1">That's a wrap</h2>
              <p className="text-white/50 text-sm mb-4">Great session — here's how it went</p>
            </div>
            {streamId && (
              <>
                <PostStreamSummaryCard creatorId={streamCreatorId} streamId={streamId} />
                <EarningsBreakdown streamId={streamId} creatorId={streamCreatorId} />
              </>
            )}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-[2] min-h-[48px] py-3 rounded-full bg-live text-white text-sm font-bold shadow-glow-live hover:brightness-110 transition-all no-select">Go live again</button>
              <button onClick={() => router.push('/dashboard/earnings')} className="flex-1 min-h-[48px] py-3 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/12 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">Earnings</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
