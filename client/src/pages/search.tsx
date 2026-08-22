import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Search, TrendingUp, User as UserIcon, Hash, Play, Radio } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';
import { CATEGORIES } from '@/lib/categories';

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

interface ExploreStream {
  id: string;
  title: string;
  status: 'LIVE' | 'SCHEDULED';
  category?: string | null;
  viewerCount: number;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
  creator: { username?: string; displayName?: string; avatarUrl?: string | null };
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
  const [streams, setStreams] = useState<ExploreStream[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setError('Search failed'); return; }
      const data = await res.json();
      setUsers(data.users || []);
      setReels(data.reels || []);
      setTags(data.tags || []);
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Explore mode (no query): mixed live + reels grid, filterable by category
  const explore = useCallback(async (cat: string) => {
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/api/search/explore${cat ? `?category=${encodeURIComponent(cat)}` : ''}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setStreams(data.streams || []);
      // Explore's reel ranking replaces the plain-trending reels in this mode
      if (Array.isArray(data.reels)) setReels(data.reels);
    } catch {}
  }, []);

  // Load trending on mount
  useEffect(() => { search(''); }, [search]);

  // Debounced search; explore grid refreshes whenever query clears or the
  // category chip changes
  useEffect(() => {
    if (!query) {
      explore(category);
      return;
    }
    setStreams([]);
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, category, search, explore]);

  const isEmpty =
    !loading && !!query && users.length === 0 && reels.length === 0 && tags.length === 0;

  return (
    <Layout>
      <Head>
        <title>Search - Be With Me</title>
      </Head>

      <div className="min-h-screen celebration-canvas">
        {/* ─── Search bar ─── */}
        <div className="sticky top-14 z-40 bg-ink-950/85 backdrop-blur-2xl">
          <div className="max-w-[630px] mx-auto px-4 py-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-cyan/70 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Creators, reels, hashtags…"
                className="input-couture !pl-11 min-h-[48px] text-sm"
              />
            </div>
          </div>
          {/* ─── Category chips — the explore nav bar ─── */}
          <div className="max-w-[630px] mx-auto px-4 pb-2.5">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <button
                onClick={() => setCategory('')}
                className={`flex-shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all no-select ${
                  category === ''
                    ? 'bg-white/[0.12] border-white/30 text-white'
                    : 'bg-white/[0.04] border-white/10 text-white/50'
                }`}
              >
                ✨ All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(category === c.id ? '' : c.id)}
                  className={`flex-shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all no-select ${
                    category === c.id
                      ? 'bg-brand-500/25 border-brand-400/60 text-white shadow-glow'
                      : 'bg-white/[0.04] border-white/10 text-white/50'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          {/* neon hairline seam */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/25 via-accent-violet/30 to-accent-cyan/25"
            aria-hidden
          />
        </div>

        <div className="max-w-[630px] mx-auto px-4 pb-24 safe-area-pb pt-5">
          {category === 'education' && (
            <Link
              href="/classes"
              className="mb-4 flex items-center justify-between glass-card !rounded-2xl px-4 py-3 border !border-accent-cyan/25 hover:!border-accent-cyan/50 transition-colors"
            >
              <span className="text-sm font-semibold text-white">🎓 Live classes — learn with a teacher in real time</span>
              <span className="text-accent-cyan text-sm font-bold flex-shrink-0 ml-3">Browse →</span>
            </Link>
          )}
          {error && (
            <p className="text-white/40 text-xs text-center mb-4">{error}</p>
          )}

          {/* ─── Trending tags ─── */}
          {tags.length > 0 && (
            <section className="mb-7 animate-rise">
              <h3 className="text-[11px] font-semibold text-accent-amber/80 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {query ? 'Tags' : 'Trending'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setQuery(`#${t.tag}`)}
                    className="glimmer overflow-hidden flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-white/[0.04] border border-white/10 hover:border-accent-amber/40 hover:bg-white/[0.07] active:scale-[0.97] transition-all duration-200 no-select"
                  >
                    <Hash className="w-3 h-3 text-brand-400" />
                    <span className="text-sm text-white">{t.tag}</span>
                    <span className="text-[11px] text-accent-amber/60">{t.count}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── Creators ─── */}
          {users.length > 0 && (
            <section className="mb-7 animate-rise" style={{ animationDelay: '80ms' }}>
              <h3 className="text-[11px] font-semibold text-accent-blue/80 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {query ? 'Creators' : 'Top Creators'}
              </h3>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 p-3 min-h-[60px] rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-accent-blue/40 hover:bg-white/[0.06] active:scale-[0.99] transition-all duration-200 no-select"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-ink-800 ring-1 ring-accent-blue/30 flex-shrink-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/70">
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-[15px] truncate">{u.displayName}</p>
                      <p className="text-white/40 text-xs">@{u.username}</p>
                    </div>
                    {u.role === 'CREATOR' && (
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-violet bg-accent-violet/10 border border-accent-violet/30 px-2.5 py-1 rounded-full">
                        Creator
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Live & upcoming streams ─── */}
          {streams.length > 0 && (
            <section className="mb-7 animate-rise" style={{ animationDelay: '120ms' }}>
              <h3 className="text-[11px] font-semibold text-live/90 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Live &amp; Upcoming
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {streams.map((s) => (
                  <Link
                    key={s.id}
                    href={`/stream/${s.id}`}
                    className="group relative aspect-[9/16] bg-ink-800 rounded-xl overflow-hidden border border-white/[0.06] no-select"
                  >
                    {(s.thumbnailUrl || s.muxPlaybackId) ? (
                      <img
                        src={s.thumbnailUrl || `https://image.mux.com/${s.muxPlaybackId}/thumbnail.jpg?width=240&height=426`}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/15 to-violet-deep/20">
                        <Radio className="w-6 h-6 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent pointer-events-none" />
                    <span
                      className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide backdrop-blur-md ${
                        s.status === 'LIVE'
                          ? 'bg-live/80 text-white'
                          : 'bg-white/15 text-white/85 border border-white/20'
                      }`}
                    >
                      {s.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      {s.status === 'LIVE' ? 'LIVE' : 'Soon'}
                    </span>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <p className="text-white text-[12px] font-bold truncate">{s.creator.displayName || s.creator.username}</p>
                      <p className="text-white/60 text-[11px] truncate">{s.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Reels grid ─── */}
          {reels.length > 0 && (
            <section className="animate-rise" style={{ animationDelay: '160ms' }}>
              <h3 className="text-[11px] font-semibold text-accent-magenta/80 uppercase tracking-[0.28em] mb-3 flex items-center gap-1.5">
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
                        <Play className="w-6 h-6 text-white/25" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[11px] text-white font-semibold">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      {r.viewsCount >= 1000 ? `${(r.viewsCount / 1000).toFixed(1)}K` : r.viewsCount}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Empty state — CSS celebration orb, no WebGL ─── */}
          {isEmpty && (
            <div className="text-center pt-12 pb-16 animate-blur-in">
              <div className="relative w-24 h-24 mx-auto mb-6 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-25 blur-2xl animate-glow-breathe" />
                <div className="absolute inset-3 rounded-full neon-hairline flex items-center justify-center animate-float">
                  <Search className="w-7 h-7 text-accent-cyan" />
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2 leading-[1.02]">
                Nothing here <span className="text-celebration">yet</span>
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
