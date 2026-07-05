import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Film, X, Loader2, Upload, Check, Hash } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type UploadStep = 'select' | 'uploading' | 'processing' | 'details' | 'posting' | 'done';

export default function CreateReel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mux upload state
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadId, setUploadId] = useState('');
  const [muxPlaybackId, setMuxPlaybackId] = useState('');
  const [muxAssetId, setMuxAssetId] = useState('');
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/auth/login');
  }, [router]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    if (f.size > 200 * 1024 * 1024) {
      setError('Video must be under 200MB');
      return;
    }

    setFile(f);
    setError('');
    setPreview(URL.createObjectURL(f));
    startUpload(f);
  }

  async function startUpload(videoFile: File) {
    setStep('uploading');
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      // 1. Get Mux direct upload URL
      // debug removed
      const uploadRes = await fetch(`${API_URL}/api/reels/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to create upload');
      }
      const { uploadUrl: url, uploadId: uid } = await uploadRes.json();
      setUploadUrl(url);
      setUploadId(uid);

      // 2. Upload video directly to Mux via PUT
      // debug removed
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', videoFile.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(videoFile);
      });

      // debug removed
      setStep('processing');

      // 3. Poll for asset ready
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes at 5s intervals
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${API_URL}/api/reels/upload/${uid}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const status = await statusRes.json();
          console.log(`[BeWithMe] Poll #${attempts}:`, status);

          if (status.playbackId) {
            clearInterval(pollInterval);
            setMuxPlaybackId(status.playbackId);
            setMuxAssetId(status.assetId || '');
            setDuration(status.duration);
            setStep('details');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            throw new Error('Video processing timed out');
          }
        } catch (err: any) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError(err.message);
            setStep('select');
          }
        }
      }, 5000);
    } catch (err: any) {
      console.error('[BeWithMe] Upload failed:', err);
      setError(err.message);
      setStep('select');
    }
  }

  async function handlePost() {
    if (!muxPlaybackId) return;
    setStep('posting');
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const tags = hashtags.split(/[,\s#]+/).filter(t => t.trim().length > 0).map(t => t.trim().toLowerCase());

      // debug removed
      const res = await fetch(`${API_URL}/api/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          videoUrl: `https://stream.mux.com/${muxPlaybackId}.m3u8`,
          muxPlaybackId,
          muxAssetId,
          caption: caption.trim() || undefined,
          hashtags: tags,
          duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to post reel');
      }

      // debug removed
      setStep('done');
      setTimeout(() => router.push('/reels'), 1500);
    } catch (err: any) {
      console.error('[BeWithMe] Post failed:', err);
      setError(err.message);
      setStep('details');
    }
  }

  return (
    <Layout>
      <Head><title>Create Reel - Be With Me</title></Head>

      <div className="min-h-screen celebration-canvas safe-area-pb">
        <div className="max-w-[630px] mx-auto px-4 py-6 pb-24">

          {/* ─── Slim celebration header ─── */}
          <div className="relative overflow-hidden celebration-canvas rounded-3xl border border-white/10 px-5 py-4 mb-6 animate-rise">
            {/* Neon seam */}
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px neon-hairline opacity-60"
              aria-hidden
            />
            <div className="relative z-[2] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-accent-magenta/20 border border-accent-magenta/30 flex items-center justify-center shadow-glow-magenta flex-shrink-0">
                  <Film className="w-5 h-5 text-accent-magenta" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                    New <span className="text-celebration">reel</span>
                  </h1>
                  <p className="text-white/40 text-xs mt-0.5">Short video · up to 200MB</p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="text-sm text-white/30 hover:text-white/60 transition-colors min-h-[44px] px-3 no-select"
              >
                Cancel
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-live/10 backdrop-blur-xl border border-live/30 text-live px-4 py-3 rounded-2xl text-sm font-medium mb-4">
              {error}
            </div>
          )}

          {/* STEP 1: Select video */}
          {step === 'select' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[500px] rounded-3xl neon-hairline flex flex-col items-center justify-center gap-4 hover:brightness-125 transition-all cursor-pointer group"
            >
              {/* Decorative glow */}
              <div
                className="pointer-events-none absolute w-32 h-32 rounded-full gradient-celebration opacity-10 blur-3xl group-hover:opacity-20 transition-opacity"
                aria-hidden
              />
              <div className="relative w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                <Upload className="w-7 h-7 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/60 group-hover:text-white/80 transition-colors">Tap to select video</p>
                <p className="text-xs text-white/25 mt-1">MP4, MOV, WebM up to 200MB</p>
              </div>
            </button>
          )}

          {/* STEP 2: Uploading */}
          {step === 'uploading' && (
            <div className="glass-card p-10 text-center animate-rise">
              <div className="relative w-14 h-14 mx-auto mb-5 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-xl animate-glow-breathe" />
                <Loader2 className="relative w-14 h-14 text-brand-400 animate-spin" />
              </div>
              <p className="text-white font-bold text-lg mb-1">Uploading...</p>
              <p className="text-white/40 text-sm mb-5">{uploadProgress}%</p>
              <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full gradient-celebration rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <div className="glass-card p-10 text-center animate-rise">
              <div className="relative w-14 h-14 mx-auto mb-5 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full bg-accent-cyan/20 blur-xl animate-glow-breathe" />
                <Loader2 className="relative w-14 h-14 text-accent-cyan animate-spin" />
              </div>
              <p className="text-white font-bold text-lg mb-1">Processing video...</p>
              <p className="text-white/40 text-sm">This usually takes 30–60 seconds</p>
            </div>
          )}

          {/* STEP 4: Add details */}
          {step === 'details' && (
            <div className="space-y-4 animate-rise">
              {/* Video preview */}
              {preview && (
                <div className="relative rounded-3xl overflow-hidden neon-hairline aspect-[9/16] max-h-[400px]">
                  <video src={preview} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-accent-green/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-glow-green">
                    <Check className="w-3 h-3" /> Ready
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="glass-card p-4">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  maxLength={500}
                  rows={3}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors resize-none"
                />
                <p className="text-white/25 text-[11px] text-right mt-1">{caption.length}/500</p>
              </div>

              {/* Hashtags */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-3.5 h-3.5 text-accent-cyan/60" />
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Hashtags</label>
                </div>
                <input
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="gaming, music, irl, talk"
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/30 transition-colors"
                />
              </div>

              {/* Publish button */}
              <button
                onClick={handlePost}
                className="w-full min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all no-select"
              >
                Post Reel
              </button>
            </div>
          )}

          {/* STEP 5: Posting */}
          {step === 'posting' && (
            <div className="glass-card p-10 text-center animate-rise">
              <div className="relative w-12 h-12 mx-auto mb-4 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-xl animate-glow-breathe" />
                <Loader2 className="relative w-12 h-12 text-brand-400 animate-spin" />
              </div>
              <p className="text-white font-semibold">Posting your reel...</p>
            </div>
          )}

          {/* STEP 6: Done */}
          {step === 'done' && (
            <div className="glass-card celebration-canvas p-10 text-center animate-rise">
              <div className="relative w-20 h-20 mx-auto mb-6 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
                <div className="absolute inset-0 rounded-full neon-hairline flex items-center justify-center">
                  <Check className="w-9 h-9 text-accent-green" />
                </div>
              </div>
              <p className="text-white text-xl font-extrabold tracking-tight mb-1">Reel posted!</p>
              <p className="text-white/40 text-sm">Redirecting to reels...</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

        </div>
      </div>
    </Layout>
  );
}
