import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Film, ArrowLeft } from 'lucide-react';

const ReelFeed = dynamic(
  () => import('@/features/reels/ReelFeed').then(m => m.ReelFeed),
  { ssr: false }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ReelData = {
  id: string;
  creatorId: string;
  videoUrl: string;
  muxPlaybackId?: string;
  caption?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  creator: { id: string; username: string; displayName: string; avatarUrl?: string } | null;
};

export default function ReelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [reel, setReel] = useState<ReelData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_URL}/api/reels/${id}`, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        if (data?.reel) {
          setReel(data.reel);
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      })
      .catch(() => { if (!cancelled) setStatus('notfound'); });

    return () => { cancelled = true; };
  }, [id]);

  return (
    <>
      <Head>
        <title>Reel - Be With Me</title>
      </Head>

      {status === 'loading' && (
        <div className="flex items-center justify-center h-[100dvh] bg-[#0a0a0a]">
          <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-brand-500 animate-spin" />
        </div>
      )}

      {status === 'notfound' && (
        <div className="relative flex flex-col items-center justify-center h-[100dvh] bg-[#0a0a0a] celebration-canvas px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/25 shadow-glow-sm flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-brand-400" />
          </div>
          <p className="text-white font-bold text-base mb-1">Reel unavailable</p>
          <p className="text-white/40 text-sm mb-6">This reel may have been removed or is still processing.</p>
          <button
            onClick={() => router.push('/reels')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-white text-sm font-bold shadow-glow glimmer overflow-hidden active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reels
          </button>
        </div>
      )}

      {status === 'ready' && reel && <ReelFeed seedReel={reel} showBack />}
    </>
  );
}
