import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ImagePlus, X, Loader2, Film, Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CreatePost() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  // Auth check on mount
  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/auth/login');
  }, [router]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  function clearImage() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePost() {
    if (!file) return;
    setPosting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      if (caption.trim()) formData.append('caption', caption.trim());

      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to create post');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <Layout>
      <Head>
        <title>Create Post - Be With Me</title>
      </Head>

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
                <div className="w-11 h-11 rounded-full gradient-celebration flex items-center justify-center shadow-glow flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                    Create
                  </h1>
                  <p className="text-white/40 text-xs mt-0.5">Share a moment</p>
                </div>
              </div>
              {/* Create type selector — reel switch pill */}
              <button
                onClick={() => router.push('/create-reel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-bold hover:bg-brand-500/20 transition-colors no-select"
              >
                <Film className="w-3.5 h-3.5" /> Reel
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-live/10 backdrop-blur-xl border border-live/30 text-live px-4 py-3 rounded-2xl text-sm font-medium mb-4">
              {error}
            </div>
          )}

          {/* Image Upload / Preview area */}
          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square rounded-3xl neon-hairline flex flex-col items-center justify-center gap-4 hover:brightness-125 transition-all cursor-pointer group"
            >
              {/* Decorative glow blob */}
              <div
                className="pointer-events-none absolute w-32 h-32 rounded-full gradient-celebration opacity-10 blur-3xl group-hover:opacity-20 transition-opacity"
                aria-hidden
              />
              <div className="relative w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/60 group-hover:text-white/80 transition-colors">Tap to upload a photo</p>
                <p className="text-xs text-white/25 mt-1">JPEG, PNG, WebP, GIF up to 10MB</p>
              </div>
            </button>
          ) : (
            <div className="relative rounded-3xl overflow-hidden neon-hairline">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ink-950/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-ink-950/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Caption */}
          {preview && (
            <div className="mt-4 glass-card p-4 animate-rise">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                maxLength={2200}
                rows={4}
                className="w-full min-h-[48px] bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors resize-none"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-white/30">{caption.length}/2,200</span>
              </div>
            </div>
          )}

          {/* Publish button */}
          {preview && (
            <button
              onClick={handlePost}
              disabled={!file || posting}
              className="mt-4 w-full min-h-[48px] py-3 rounded-full gradient-celebration text-white text-sm font-bold shadow-glow hover:brightness-110 transition-all disabled:opacity-50 disabled:shadow-none no-select"
            >
              {posting ? 'Sharing...' : 'Share'}
            </button>
          )}

          {/* Cancel link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.back()}
              className="text-sm text-white/30 hover:text-white/60 transition-colors min-h-[44px] px-4"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>

      {/* Posting overlay */}
      {posting && (
        <div className="fixed inset-0 celebration-canvas flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center animate-rise">
            <div className="relative w-14 h-14 mx-auto mb-4 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-xl animate-glow-breathe" />
              <Loader2 className="relative w-14 h-14 text-brand-400 animate-spin" />
            </div>
            <p className="text-white text-sm font-semibold">Sharing your post...</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
