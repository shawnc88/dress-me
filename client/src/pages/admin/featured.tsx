import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ChevronLeft, Search, ArrowUp, ArrowDown, X, Plus, Star } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { getStoredUser } from '@/utils/authUser';

// ─── The editorial shelf ─────────────────────────────────────────
// Shawn's hand-curated Featured list: shows first on Explore. At founding
// scale a human curator beats any ranking model — and "I'll feature you on
// the homepage" is a recruiting perk that costs nothing.

interface CreatorRow {
  id: string;
  category?: string | null;
  isLive?: boolean;
  user: { username: string; displayName: string; avatarUrl?: string | null };
}

export default function AdminFeatured() {
  const router = useRouter();
  const [currentUser] = useState(() => getStoredUser());
  const [slots, setSlots] = useState<CreatorRow[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CreatorRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ slots: { creatorId: string; creator: CreatorRow | null }[] }>('/api/admin/featured');
      setSlots(
        data.slots
          .filter(s => s.creator)
          .map(s => ({ ...(s.creator as CreatorRow), id: s.creatorId }))
      );
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') { router.replace('/'); return; }
    load();
  }, [currentUser, load, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      apiFetch<{ creators: CreatorRow[] }>(`/api/admin/creators?search=${encodeURIComponent(search)}`)
        .then(d => setResults(d.creators))
        .catch(() => {});
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  async function save(next: CreatorRow[]) {
    setSlots(next);
    setSaving(true);
    try {
      await apiFetch('/api/admin/featured', {
        method: 'PUT',
        body: JSON.stringify({ creatorIds: next.map(s => s.id) }),
      });
      setSavedAt(Date.now());
    } catch {}
    setSaving(false);
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...slots];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  }

  const slotIds = new Set(slots.map(s => s.id));

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <Head><title>Featured - Admin</title></Head>
      <div className="max-w-[720px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-primary hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-amber/80">The editorial shelf</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Featured creators</h1>
          </div>
          <span className="text-tertiary text-[11px]">
            {saving ? 'Saving…' : savedAt ? 'Saved ✓' : ''}
          </span>
        </div>

        {/* Current shelf, in order */}
        <div className="space-y-2">
          {slots.length === 0 && (
            <div className="bg-white/[0.03] rounded-3xl border border-white/[0.08] py-8 text-center">
              <p className="text-tertiary text-sm">Nothing featured yet — add creators below. Order here = order on Explore.</p>
            </div>
          )}
          {slots.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-accent-amber/25 px-3.5 py-2.5">
              <span className="w-6 text-center text-accent-amber font-extrabold text-sm">{i + 1}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-ink-800 flex-shrink-0">
                {s.user.avatarUrl ? (
                  <img src={s.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-secondary font-bold">{s.user.displayName.charAt(0)}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {s.user.displayName}
                  {s.isLive && <span className="ml-2 text-live text-[11px] font-bold">● LIVE</span>}
                </p>
                <p className="text-tertiary text-[11px] truncate">@{s.user.username}{s.category ? ` · ${s.category}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} aria-label="Move up" className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-tertiary hover:text-white disabled:opacity-30" disabled={i === 0}>
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, 1)} aria-label="Move down" className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-tertiary hover:text-white disabled:opacity-30" disabled={i === slots.length - 1}>
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => save(slots.filter(x => x.id !== s.id))} aria-label="Remove" className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-red-400/70 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Picker */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-tertiary mb-2">Add a creator</p>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search creators…"
              className="w-full min-h-[48px] rounded-2xl bg-white/[0.05] border border-white/10 pl-11 pr-4 text-white text-sm placeholder:text-decorative focus:outline-none focus:border-accent-amber/40"
            />
          </div>
          <div className="space-y-1.5">
            {results.filter(r => !slotIds.has(r.id)).map(r => (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => slots.length < 12 && save([...slots, r])}
                className="w-full flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 px-3.5 py-2.5 text-left no-select"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-ink-800 flex-shrink-0">
                  {r.user.avatarUrl ? (
                    <img src={r.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary font-bold text-sm">{r.user.displayName.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary text-sm font-semibold truncate">{r.user.displayName}</p>
                  <p className="text-tertiary text-[11px] truncate">@{r.user.username}</p>
                </div>
                <Plus className="w-4 h-4 text-accent-amber/70 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>

        <p className="text-decorative text-[11px] flex items-center gap-1.5">
          <Star className="w-3 h-3" /> Order here is the order on Explore. Max 12. Changes save instantly.
        </p>
      </div>
    </div>
  );
}
