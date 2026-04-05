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
      <div className="max-w-[630px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl gradient-premium flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Go Live</h1>
            <p className="text-gray-500 text-sm">Stream from your camera</p>
          </div>
        </div>

        {error && <div className="bg-live/10 text-live px-4 py-3 rounded-2xl text-sm mb-6">{error}</div>}

        {/* Not a creator */}
        {!isCreator && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-card rounded-2xl border border-white/5 p-8 text-center">
            <Sparkles className="w-12 h-12 text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Become a Creator</h2>
            <p className="text-gray-400 mb-6 text-sm">Set up your creator profile to start streaming.</p>
            <button onClick={() => router.push('/become-creator')} className="px-6 py-3 rounded-xl gradient-premium text-white text-sm font-bold">Start Creator Setup</button>
          </motion.div>
        )}

        {/* STEP 1: Title form */}
        {isCreator && step === 'form' && (
          <form onSubmit={createStream} className="bg-surface-card rounded-2xl border border-white/5 p-6 space-y-5">
            <div className="bg-brand-500/10 text-brand-300 px-4 py-3 rounded-xl text-sm">
              Stream directly from your camera. No extra apps needed!
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Stream Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                placeholder="e.g., Spring Fashion Haul 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none"
                placeholder="Tell viewers what to expect..." />
            </div>
            <button type="submit" disabled={creating || !title.trim()}
              className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold disabled:opacity-50">
              {creating ? 'Setting up...' : 'Set Up Camera'}
            </button>
          </form>
        )}

        {/* STEP 2: Camera preview */}
        {isCreator && step === 'preview' && (
          <div className="space-y-5">
            <div className="bg-surface-card rounded-2xl border border-amber-500/20 p-4">
              <p className="text-amber-400 text-sm font-semibold">Check your camera and mic before going live</p>
            </div>
            <DevicePreview onReady={() => setPreviewReady(true)} onError={(msg) => setError(msg)} />
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-semibold">Back</button>
              <button onClick={goLive} disabled={!previewReady}
                className="flex-1 py-3 rounded-xl gradient-premium text-white text-sm font-bold disabled:opacity-50">
                Go Live Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Broadcasting */}
        {isCreator && step === 'live' && (
          <div className="space-y-5">
            <BrowserPublisher
              token={livekitToken}
              wsUrl={livekitWsUrl}
              streamTitle={streamTitle}
              onTracksReady={handleTracksReady}
              onDisconnect={endStream}
            />

            {streamStatus === 'LIVE' && (
              <>
                <LiveStreamMetrics streamId={streamId} />

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
                      } catch {}
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
                            }
                          } catch {}
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
                          } catch { alert('Failed to join Suite'); }
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
                          } catch {}
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
          <div className="space-y-4">
            <div className="bg-surface-card rounded-2xl border border-white/5 p-6 text-center">
              <PartyPopper className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-1">Stream Ended</h2>
              <p className="text-gray-500 text-sm mb-4">Great session! Here's your summary</p>
            </div>
            {streamId && (
              <>
                <PostStreamSummaryCard creatorId={streamCreatorId} streamId={streamId} />
                <EarningsBreakdown streamId={streamId} creatorId={streamCreatorId} />
              </>
            )}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl gradient-premium text-white text-sm font-bold">Go Live Again</button>
              <button onClick={() => router.push('/dashboard/earnings')} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">View Earnings</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
