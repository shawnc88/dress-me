import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { LiveStreamMetrics } from '@/components/ui/LiveStreamMetrics';
import { Copy, Check, PartyPopper, ExternalLink, Radio, Sparkles, StopCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StreamData {
  streamId: string;
  title: string;
  rtmpUrl: string;
  streamKey: string;
  playbackId: string;
  status: string;
}

type Step = 'form' | 'credentials' | 'live' | 'ended';

export default function GoLive() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [ending, setEnding] = useState(false);

  // Polling for stream status (waiting for Mux webhook to set LIVE)
  const [streamStatus, setStreamStatus] = useState<string>('idle');

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

  // Poll stream status when waiting for RTMP connection
  useEffect(() => {
    if (!streamData || step === 'ended') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/streams/${streamData.streamId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setStreamStatus(data.streamStatus);
        if (data.streamStatus === 'LIVE' && step === 'credentials') {
          setStep('live');
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [streamData, step]);

  async function createStream(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setCreating(true);
    setError('');

    try {
      // 1. Create stream
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, ingestMode: 'rtmp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create stream');

      // 2. Mark as starting
      await fetch(`${API_URL}/api/streams/${data.stream.id}/live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setStreamData({
        streamId: data.stream.id,
        title: data.stream.title,
        rtmpUrl: data.rtmpUrl || 'rtmp://global-live.mux.com:5222/app',
        streamKey: data.streamKey || '',
        playbackId: data.playbackId || data.stream.muxPlaybackId || '',
        status: 'starting',
      });
      setStreamStatus('SCHEDULED');
      setStep('credentials');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function endStream() {
    if (!token || !streamData || ending) return;
    setEnding(true);
    try {
      await fetch(`${API_URL}/api/streams/${streamData.streamId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch {}
    setEnding(false);
    setStep('ended');
  }

  function resetForm() {
    setStep('form');
    setStreamData(null);
    setStreamStatus('idle');
    setTitle('');
    setDescription('');
    setError('');
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  return (
    <Layout>
      <Head><title>Go Live - Dress Me</title></Head>

      <div className="max-w-[630px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl gradient-premium flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Go Live</h1>
            <p className="text-gray-500 text-sm">Stream via OBS or Streamlabs</p>
          </div>
        </div>

        {error && (
          <div className="bg-live/10 text-live px-4 py-3 rounded-2xl text-sm mb-6">{error}</div>
        )}

        {/* Not a creator */}
        {!isCreator && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 text-center">
            <Sparkles className="w-12 h-12 text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Become a Creator</h2>
            <p className="text-gray-400 mb-6 text-sm">Set up your creator profile to start streaming.</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push('/become-creator')} className="btn-glow">
              Start Creator Setup
            </motion.button>
          </motion.div>
        )}

        {/* Step 1: Stream form */}
        {isCreator && step === 'form' && (
          <form onSubmit={createStream} className="bg-surface-card rounded-2xl border border-white/5 p-6 space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-white mb-2">Stream Title</label>
              <input
                id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                required maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                placeholder="e.g., Spring Fashion Haul 2026"
              />
            </div>
            <div>
              <label htmlFor="desc" className="block text-sm font-medium text-white mb-2">Description (optional)</label>
              <textarea
                id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={500} rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none"
                placeholder="Tell viewers what to expect..."
              />
            </div>
            <button type="submit" disabled={creating || !title.trim()}
              className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold disabled:opacity-50 transition-opacity">
              {creating ? 'Creating Stream...' : 'Create Stream'}
            </button>
          </form>
        )}

        {/* Step 2: RTMP credentials (waiting for OBS to connect) */}
        {isCreator && step === 'credentials' && streamData && (
          <div className="space-y-5">
            <div className="bg-surface-card rounded-2xl border border-amber-500/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                <span className="font-bold text-amber-400 text-sm">Waiting for OBS to connect...</span>
              </div>
              <p className="text-gray-400 text-xs">
                Open OBS, paste the credentials below, and click "Start Streaming". The stream will go live automatically.
              </p>
            </div>

            <div className="bg-surface-card rounded-2xl border border-white/5 p-5 space-y-4">
              <h3 className="font-bold text-white">OBS / Streamlabs Setup</h3>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">RTMP Server URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white/5 px-3 py-2.5 rounded-xl text-sm text-white font-mono break-all">{streamData.rtmpUrl}</code>
                  <button onClick={() => copyToClipboard(streamData.rtmpUrl, 'rtmp')} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    {copied === 'rtmp' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Stream Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white/5 px-3 py-2.5 rounded-xl text-sm text-white font-mono break-all">{streamData.streamKey}</code>
                  <button onClick={() => copyToClipboard(streamData.streamKey, 'key')} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    {copied === 'key' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5">
                <h4 className="font-medium text-white text-xs mb-2">Quick Steps:</h4>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Copy the Server URL and Stream Key above</li>
                  <li>Open OBS → Settings → Stream → Custom</li>
                  <li>Paste the Server URL and Stream Key</li>
                  <li>Click "Start Streaming" in OBS</li>
                  <li>Stream auto-activates when Mux receives video</li>
                </ol>
              </div>
            </div>

            <button onClick={endStream} disabled={ending}
              className="w-full py-3 rounded-xl bg-red-600/20 text-red-400 text-sm font-semibold hover:bg-red-600/30 transition-colors disabled:opacity-50">
              {ending ? 'Cancelling...' : 'Cancel Stream'}
            </button>
          </div>
        )}

        {/* Step 3: LIVE (Mux confirmed active) */}
        {isCreator && step === 'live' && streamData && (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-red-500/10 via-brand-500/10 to-violet-500/10 rounded-2xl border border-red-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                <span className="text-white font-semibold text-sm">{streamData.title}</span>
              </div>
              <p className="text-gray-400 text-xs">Your stream is live! Viewers can watch now.</p>
            </div>

            <LiveStreamMetrics streamId={streamData.streamId} />

            <div className="flex gap-3">
              <button onClick={() => router.push(`/stream/${streamData.streamId}`)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold text-center hover:bg-white/15 transition-colors inline-flex items-center justify-center gap-1">
                View Stream <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => window.open(`/stream/${streamData.streamId}`, '_blank')}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-semibold text-center hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-1">
                New Tab <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={endStream} disabled={ending}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <StopCircle className="w-4 h-4" />
              {ending ? 'Ending Stream...' : 'End Live'}
            </button>
          </div>
        )}

        {/* Step 4: Ended */}
        {isCreator && step === 'ended' && (
          <div className="bg-surface-card rounded-2xl border border-white/5 p-8 text-center">
            <PartyPopper className="w-12 h-12 text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Stream Ended</h2>
            <p className="text-gray-500 mb-6">Thanks for streaming!</p>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl gradient-premium text-white text-sm font-bold">
              Start Another Stream
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
