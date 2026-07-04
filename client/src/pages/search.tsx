import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Search, TrendingUp, User as UserIcon, Hash, Play } from 'lucide-react';

/* Lazy WebGL hero — only pulled in for the couture empty state. */
const FloatingGem = dynamic(
  () => import('@/components/3d/couture').then((m) => m.FloatingGem),
  { ssr: false }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role?: string;
}

interface SearchReel {
  id: string;
  thumbnailUrl?: string;
  muxPlaybackId?: string;
  caption?: string;
  viewsCount: number;
  likesCount: number;
}

interface SearchTag {
  tag: string;
  count: number;
}

export default function SearchRoute() {
  // Read initial query from URL (e.g., /search?q=%23fashion)
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || '';
    }
    return '';
  });
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [reels, setReels] = useState<SearchReel[]>([]);
  const [tags, setTags] = useState<SearchTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setError('Search failed'); return; }
      const data = await res.json();
      setUsers(data.users || []);
      setReels(data.reels || []);
      setTags(data.tags || []);
    } catch {
      setError('Search failed. Check your connection.');
    }
    setLoading(false);
  }, []);

  // Load trending on mount
  useEffect(() => { search(''); }, [search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const isEmpty =
    !loading && !!query && users.length === 0 && reels.length === 0 && tags.length === 0;

  return (
    <Layout>
      <Head>
        <title>Search - Be With Me</title>
      </Head>

      <div className="min-h-screen nightfall-canvas">
        {/* ─── Couture search bar ─── */}
        <div className="sticky top-14 z-40 bg-ink-950/85 backdrop-blur-2xl">
          <div className="max-w-[630px] mx-auto px-4 py-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-300/60 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Creators, reels, hashtags…"
                className="input-couture !pl-11 min-h-[48px] text-sm"
              />
            </div>
          </div>
          {/* rose-gold hairline seam */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-300/25 to-transparent"
            aria-hidden
          />
        </div>

        <div className="max-w-[630px] mx-auto px-4 pb-24 safe-area-pb pt-5">
          {error && (
            <p className="text-white/40 text-xs text-center mb-4">{error}</p>
          )}

          {/* ─── Trending tags ─── */}
          {tags.length > 0 && (
            <section className="mb-7 animate-rise">
              <h3 className="text-[10px] font-semibold text-gold-300/70 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {query ? 'Tags' : 'Trending'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setQuery(`#${t.tag}`)}
                    className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-white/[0.04] border border-white/10 hover:border-gold-300/40 hover:bg-white/[0.07] active:scale-[0.97] transition-all duration-200 no-select"
                  >
                    <Hash className="w-3 h-3 text-brand-400" />
                    <span className="text-sm text-white">{t.tag}</span>
                    <span className="text-[10px] text-gold-300/50">{t.count}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── Creators ─── */}
          {users.length > 0 && (
            <section className="mb-7 animate-rise" style={{ animationDelay: '80ms' }}>
              <h3 className="text-[10px] font-semibold text-gold-300/70 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {query ? 'Creators' : 'Top Creators'}
              </h3>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 p-3 min-h-[60px] rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-gold-300/30 hover:bg-white/[0.06] active:scale-[0.99] transition-all duration-200 no-select"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-ink-800 ring-1 ring-gold-300/30 flex-shrink-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gold-200/70">
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="editorial text-white text-[15px] truncate">{u.displayName}</p>
                      <p className="text-white/40 text-xs">@{u.username}</p>
                    </div>
                    {u.role === 'CREATOR' && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold-200 bg-gold-300/10 border border-gold-300/30 px-2.5 py-1 rounded-full">
                        Creator
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Reels grid ─── */}
          {reels.length > 0 && (
            <section className="animate-rise" style={{ animationDelay: '160ms' }}>
              <h3 className="text-[10px] font-semibold text-gold-300/70 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                {query ? 'Reels' : 'Trending Reels'}
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {reels.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reels/${r.id}`}
                    className="group relative aspect-[9/16] bg-ink-800 rounded-xl overflow-hidden border border-white/[0.06] no-select"
                  >
                    {(r.thumbnailUrl || r.muxPlaybackId) ? (
                      <img
                        src={r.thumbnailUrl || `https://image.mux.com/${r.muxPlaybackId}/thumbnail.jpg?time=2&width=240&height=426`}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-gold-300/25" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[10px] text-white font-semibold">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      {r.viewsCount >= 1000 ? `${(r.viewsCount / 1000).toFixed(1)}K` : r.viewsCount}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Editorial empty state — the one 3D moment on this view ─── */}
          {isEmpty && (
            <div className="text-center pt-12 pb-16 animate-blur-in">
              <div className="flex justify-center mb-4">
                <FloatingGem size={150} tone="gold" intensity="full" />
              </div>
              <h2 className="editorial text-3xl text-white mb-2 leading-[1.02]">
                Nothing in the <span className="text-couture-gold">atelier</span>
              </h2>
              <p className="text-white/45 text-sm max-w-[260px] mx-auto leading-relaxed">
                No results for &ldquo;{query}&rdquo; — try a creator&rsquo;s name or a trending tag.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
