import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { DevicePreview } from '@/components/video/DevicePreview';
import { AnimatedLiveBadge } from '@/components/ui/AnimatedLiveBadge';
import { Video, Copy, Check, PartyPopper, ExternalLink, Radio, Sparkles } from 'lucide-react';

const BrowserPublisher = dynamic(
  () => import('@/components/video/BrowserPublisher').then((m) => m.BrowserPublisher),
  { ssr: false },
);

import { RafflePanel } from '@/components/video/RafflePanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || '';

type IngestMode = 'browser' | 'rtmp';
type BrowserStep = 'form' | 'preview' | 'live' | 'ended';

interface StreamCredentials {
  streamId: string;
  title: string;
  rtmpUrl: string;
  streamKey: string;
  playbackUrl: string;
  status: string;
}

interface BrowserStreamState {
  streamId: string;
  title: string;
  livekitToken: string;
  livekitWsUrl: string;
}

export default function GoLive() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [copied, setCopied] = useState('');

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingestMode, setIngestMode] = useState<IngestMode>(LIVEKIT_WS_URL ? 'browser' : 'rtmp');

  // Browser streaming state
  const [browserStep, setBrowserStep] = useState<BrowserStep>('form');
  const [browserStream, setBrowserStream] = useState<BrowserStreamState | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

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

  async function becomeCreator() {
    if (!token) return;
    setApplying(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/creators/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to apply');
      }

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      setUser(meData.user);

      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: parsed.email, password: prompt('Re-enter your password to activate creator role:') }),
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          localStorage.setItem('token', loginData.token);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          setToken(loginData.token);
          setUser(loginData.user);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  // ─── OBS (RTMP) Flow ──────────────────────────────────────────

  async function createStreamRtmp(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, ingestMode: 'rtmp' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create stream');

      const liveRes = await fetch(`${API_URL}/api/streams/${data.stream.id}/live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const liveData = await liveRes.json();

      setCredentials({
        streamId: data.stream.id,
        title: data.stream.title,
        rtmpUrl: data.rtmpUrl || 'rtmp://global-live.mux.com:5222/app',
        streamKey: data.streamKey || 'N/A',
        playbackUrl: data.stream.muxPlaybackId
          ? `https://stream.mux.com/${data.stream.muxPlaybackId}.m3u8`
          : '',
        status: liveData.stream?.status || 'LIVE',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ─── Browser Flow ─────────────────────────────────────────────

  async function createStreamBrowser(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setCreating(true);
    setError('');

    try {
      // 1. Create stream with browser ingest mode
      const res = await fetch(`${API_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, ingestMode: 'browser' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create stream');

      // 2. Get LiveKit token
      const tokenRes = await fetch(`${API_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ streamId: data.stream.id }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Failed to get streaming token');

      setBrowserStream({
        streamId: data.stream.id,
        title: data.stream.title,
        livekitToken: tokenData.token,
        livekitWsUrl: tokenData.wsUrl,
      });

      // 3. Show preview
      setBrowserStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function goLiveBrowser() {
    if (!token || !browserStream) return;
    setBrowserStep('live');
  }

  const handleLivekitConnected = useCallback(async () => {
    if (!token || !browserStream) return;
    try {
      // Start egress by marking stream as live
      await fetch(`${API_URL}/api/streams/${browserStream.streamId}/live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [token, browserStream]);

  const [ending, setEnding] = useState(false);

  async function endBrowserStream() {
    if (!token || !browserStream || ending) return;
    setEnding(true);
    try {
      await fetch(`${API_URL}/api/streams/${browserStream.streamId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'soft' }),
      });
    } catch {
      // Best effort
    }
    setEnding(false);
    setBrowserStep('ended');
  }

  async function endRtmpStream() {
    if (!token || !credentials || ending) return;
    setEnding(true);
    try {
      await fetch(`${API_URL}/api/streams/${credentials.streamId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'soft' }),
      });
    } catch {
      // Best effort
    }
    setEnding(false);
    setCredentials(null);
    setBrowserStep('ended');
  }

  function resetForm() {
    setBrowserStep('form');
    setBrowserStream(null);
    setCredentials(null);
    setPreviewReady(false);
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
          <div className="text-gray-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  return (
    <Layout>
      <Head>
        <title>Go Live - Dress Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl gradient-premium flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Go Live</h1>
            <p className="text-gray-500 text-sm">Start streaming in seconds</p>
          </div>
        </div>

        {error && (
          <div className="bg-live/10 text-live px-4 py-3 rounded-2xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Become a creator if not already */}
        {!isCreator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-glass p-8 text-center"
          >
            <div className="w-16 h-16 rounded-3xl gradient-premium flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Become a Creator</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Set up your creator profile to start streaming. Free and takes under 2 minutes!
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/become-creator')}
              className="btn-glow"
            >
              Start Creator Setup
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Create a stream (with mode tabs) */}
        {isCreator && !credentials && browserStep === 'form' && (
          <div className="space-y-6">
            {/* Ingest Mode Tabs */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              <button
                onClick={() => setIngestMode('browser')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  ingestMode === 'browser'
                    ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Stream from Browser
              </button>
              <button
                onClick={() => setIngestMode('rtmp')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  ingestMode === 'rtmp'
                    ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Stream with OBS
              </button>
            </div>

            {/* Stream Form */}
            <form onSubmit={ingestMode === 'browser' ? createStreamBrowser : createStreamRtmp} className="card p-8 space-y-6">
              {ingestMode === 'browser' && (
                <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 px-4 py-3 rounded-lg text-sm">
                  Stream directly from your browser using your camera and microphone. No extra software needed!
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Stream Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                  placeholder="e.g., Spring Fashion Haul 2026"
                />
              </div>

              <div>
                <label htmlFor="desc" className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition resize-none"
                  placeholder="Tell viewers what to expect..."
                />
              </div>

              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="btn-primary w-full text-center disabled:opacity-50"
              >
                {creating
                  ? 'Setting up...'
                  : ingestMode === 'browser'
                    ? 'Set Up Camera'
                    : 'Create Stream & Go Live'}
              </button>
            </form>
          </div>
        )}

        {/* Browser Mode: Preview Step */}
        {isCreator && browserStep === 'preview' && browserStream && (
          <div className="space-y-6">
            <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <h3 className="font-bold text-yellow-700 dark:text-yellow-400 mb-1">Camera Preview</h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Check your camera and microphone before going live. Click &quot;Go Live Now&quot; when ready.
              </p>
            </div>

            <DevicePreview
              onReady={() => setPreviewReady(true)}
              onError={(msg) => setError(msg)}
            />

            <div className="flex gap-4">
              <button
                onClick={resetForm}
                className="btn-secondary flex-1 text-center"
              >
                Back
              </button>
              <button
                onClick={goLiveBrowser}
                disabled={!previewReady}
                className="btn-primary flex-1 text-center disabled:opacity-50"
              >
                Go Live Now
              </button>
            </div>
          </div>
        )}

        {/* Browser Mode: Live Step */}
        {isCreator && browserStep === 'live' && browserStream && (
          <div className="space-y-6">
            <BrowserPublisher
              token={browserStream.livekitToken}
              wsUrl={browserStream.livekitWsUrl}
              streamTitle={browserStream.title}
              onConnected={handleLivekitConnected}
              onDisconnect={endBrowserStream}
            />

            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/stream/${browserStream.streamId}`)}
                className="btn-secondary flex-1 text-center"
              >
                View as Viewer
              </button>
              <button
                onClick={() => window.open(`/stream/${browserStream.streamId}`, '_blank')}
                className="btn-secondary flex-1 text-center inline-flex items-center justify-center"
              >
                Open in New Tab
                <ExternalLink className="w-4 h-4 ml-1 inline" />
              </button>
            </div>

            {token && (
              <RafflePanel streamId={browserStream.streamId} token={token} />
            )}
          </div>
        )}

        {/* Browser Mode: Ended */}
        {isCreator && browserStep === 'ended' && (
          <div className="card p-8 text-center">
            <PartyPopper className="w-12 h-12 text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Stream Ended</h2>
            <p className="text-gray-500 mb-6">Thanks for streaming!</p>
            <button onClick={resetForm} className="btn-primary">
              Start Another Stream
            </button>
          </div>
        )}

        {/* OBS Mode: Show credentials */}
        {credentials && (
          <div className="space-y-6">
            <div className="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-bold text-green-700 dark:text-green-400">Stream is Live!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                &quot;{credentials.title}&quot; — now connect OBS to start broadcasting video.
              </p>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-bold text-lg">OBS / Streamlabs Setup</h3>
              <p className="text-sm text-gray-500">
                Open OBS → Settings → Stream → Service: Custom
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">RTMP Server URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl text-sm font-mono break-all">
                    {credentials.rtmpUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(credentials.rtmpUrl, 'rtmp')}
                    className="btn-secondary !px-3 !py-2 text-sm whitespace-nowrap"
                  >
                    {copied === 'rtmp' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Stream Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl text-sm font-mono break-all">
                    {credentials.streamKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(credentials.streamKey, 'key')}
                    className="btn-secondary !px-3 !py-2 text-sm whitespace-nowrap"
                  >
                    {copied === 'key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm mb-2">Quick Steps:</h4>
                <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Copy the Server URL and Stream Key above</li>
                  <li>Open OBS → Settings → Stream → Custom</li>
                  <li>Paste the Server URL and Stream Key</li>
                  <li>Click &quot;Start Streaming&quot; in OBS</li>
                  <li>Viewers will see your video within seconds!</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/stream/${credentials.streamId}`)}
                className="btn-primary flex-1 text-center inline-flex items-center justify-center"
              >
                View Your Stream
                <ExternalLink className="w-4 h-4 ml-1 inline" />
              </button>
              <button
                onClick={() => window.open(`/stream/${credentials.streamId}`, '_blank')}
                className="btn-secondary flex-1 text-center inline-flex items-center justify-center"
              >
                Open in New Tab
                <ExternalLink className="w-4 h-4 ml-1 inline" />
              </button>
            </div>

            <button
              onClick={endRtmpStream}
              disabled={ending}
              className="w-full py-3 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
            >
              {ending ? 'Ending Stream...' : 'End Live'}
            </button>

            {token && (
              <RafflePanel streamId={credentials.streamId} token={token} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
