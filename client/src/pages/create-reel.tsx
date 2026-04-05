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
      <div className="max-w-[630px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-sm text-white/40">Cancel</button>
          <h1 className="text-base font-bold text-white flex items-center gap-2"><Film className="w-5 h-5" /> New Reel</h1>
          <div className="w-12" />
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        {/* STEP 1: Select video */}
        {step === 'select' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[500px] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-brand-500/30 hover:bg-brand-500/5 transition-colors"
          >
            <Upload className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm font-medium">Tap to select video</p>
            <p className="text-white/20 text-xs">MP4, MOV, WebM up to 200MB</p>
          </button>
        )}

        {/* STEP 2: Uploading */}
        {step === 'uploading' && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-1">Uploading...</p>
            <p className="text-white/40 text-sm mb-4">{uploadProgress}%</p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* STEP 3: Processing */}
        {step === 'processing' && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-1">Processing video...</p>
            <p className="text-white/40 text-sm">This usually takes 30-60 seconds</p>
          </div>
        )}

        {/* STEP 4: Add details */}
        {step === 'details' && (
          <div className="space-y-4">
            {/* Video preview */}
            {preview && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[400px]">
                <video src={preview} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write a caption..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none"
              />
              <p className="text-white/20 text-[10px] text-right mt-1">{caption.length}/500</p>
            </div>

            {/* Hashtags */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-3.5 h-3.5 text-white/30" />
                <label className="text-white/40 text-xs">Hashtags</label>
              </div>
              <input
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                placeholder="fashion, ootd, style"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>

            {/* Post button */}
            <button
              onClick={handlePost}
              className="w-full py-3 rounded-xl gradient-premium text-white text-sm font-bold"
            >
              Post Reel
            </button>
          </div>
        )}

        {/* STEP 5: Posting */}
        {step === 'posting' && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-white font-medium">Posting your reel...</p>
          </div>
        )}

        {/* STEP 6: Done */}
        {step === 'done' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white text-lg font-bold mb-1">Reel posted!</p>
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
    </Layout>
  );
}
