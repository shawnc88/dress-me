import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, User as UserIcon, Hash, Play } from 'lucide-react';
import Link from 'next/link';

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

export function SearchPage() {
  const [query, setQuery] = useState('');
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

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Search bar */}
      <div className="sticky top-14 z-40 px-4 py-3 bg-surface-dark/95 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators, reels, hashtags..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
        </div>
      </div>

      <div className="px-4 pb-24">
        {/* Trending tags */}
        {tags.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {query ? 'Tags' : 'Trending'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <button
                  key={t.tag}
                  onClick={() => setQuery(`#${t.tag}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Hash className="w-3 h-3 text-brand-400" />
                  <span className="text-sm text-white">{t.tag}</span>
                  <span className="text-[10px] text-white/30">{t.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Creators */}
        {users.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              {query ? 'Creators' : 'Top Creators'}
            </h3>
            <div className="space-y-2">
              {users.map(u => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/40">
                        {u.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                    <p className="text-white/40 text-xs">@{u.username}</p>
                  </div>
                  {u.role === 'CREATOR' && (
                    <span className="text-[10px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">Creator</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reels grid */}
        {reels.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              {query ? 'Reels' : 'Trending Reels'}
            </h3>
            <div className="grid grid-cols-3 gap-1">
              {reels.map(r => (
                <Link key={r.id} href={`/reels/${r.id}`} className="relative aspect-[9/16] bg-white/5 rounded-lg overflow-hidden">
                  {(r.thumbnailUrl || r.muxPlaybackId) ? (
                    <img
                      src={r.thumbnailUrl || `https://image.mux.com/${r.muxPlaybackId}/thumbnail.jpg?time=2&width=240&height=426`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] text-white font-semibold">
                    <Play className="w-2.5 h-2.5 fill-white" />
                    {r.viewsCount >= 1000 ? `${(r.viewsCount / 1000).toFixed(1)}K` : r.viewsCount}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && query && users.length === 0 && reels.length === 0 && tags.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No results for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
