import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Sparkles, Check, Loader2, Users, Shuffle, UserCheck, Send, UserPlus, Search } from 'lucide-react';
import { apiFetch } from '@/utils/api';

const TIER_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  SUPPORTER: { icon: Star, color: 'text-brand-400', bg: 'bg-brand-500/20' },
  VIP: { icon: Crown, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  INNER_CIRCLE: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

interface SuiteCandidateListProps {
  streamId: string;
  maxGuests: number;
  onInvitesSent: (userIds: string[]) => void;
}

export function SuiteCandidateList({ streamId, maxGuests, onInvitesSent }: SuiteCandidateListProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'weighted' | 'randomized'>('manual');

  useEffect(() => {
    loadCandidates();
  }, [streamId]);

  async function loadCandidates() {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/streams/${streamId}/suite/candidates`);
      setCandidates(data.candidates || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function toggleCandidate(userId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else if (next.size < maxGuests) next.add(userId);
      return next;
    });
  }

  async function handleAutoSelect() {
    setSending(true);
    try {
      const data = await apiFetch(`/api/streams/${streamId}/suite/select`, {
        method: 'POST',
        body: JSON.stringify({ mode: selectionMode, count: maxGuests }),
      });
      const ids = (data.selected || []).map((u: any) => u.id);
      setSelected(new Set(ids));
    } catch (err: any) {
      alert(err.message || 'Selection failed');
    } finally {
      setSending(false);
    }
  }

  async function handleSendInvites() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      await apiFetch(`/api/streams/${streamId}/suite/invite`, {
        method: 'POST',
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      onInvitesSent(Array.from(selected));
    } catch (err: any) {
      alert(err.message || 'Failed to send invites');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-sm font-bold">Select Suite Guests</h3>
          <p className="text-white/40 text-[10px]">
            {candidates.length} eligible fans — select up to {maxGuests}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-white/30 mr-1">Mode:</span>
          {(['manual', 'weighted', 'randomized'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSelectionMode(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectionMode === mode
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/30'
                  : 'bg-white/5 text-white/30 border border-white/5'
              }`}
            >
              {mode === 'manual' ? 'Pick' : mode === 'weighted' ? 'Weighted' : 'Random'}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-select button for non-manual modes */}
      {selectionMode !== 'manual' && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAutoSelect}
          disabled={sending}
          className="w-full py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Shuffle className="w-3.5 h-3.5" />
          {selectionMode === 'weighted' ? 'Run Weighted Selection' : 'Run Featured Fan Selection'}
        </motion.button>
      )}

      {/* Direct invite by username — invite is sent immediately, then auto-joins host */}
      <DirectInviteInput streamId={streamId} onInvited={(userId) => {
        // Direct invite already sent the invite — trigger onInvitesSent to auto-join host
        onInvitesSent([userId]);
      }} />

      {/* Candidate list */}
      {candidates.length === 0 ? (
        <div className="py-6 text-center">
          <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No eligible subscribers yet</p>
          <p className="text-white/20 text-[10px] mt-1">Use direct invite above, or subscribers will appear here</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {candidates.map((c: any) => {
            const tier = TIER_STYLE[c.tierName] || TIER_STYLE.SUPPORTER;
            const TierIcon = tier.icon;
            const isSelected = selected.has(c.userId);

            return (
              <motion.button
                key={c.userId}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectionMode === 'manual' && toggleCandidate(c.userId)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-violet-500/15 border border-violet-500/30'
                    : 'bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                    {c.user?.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/40">
                        {(c.user?.displayName || '?').charAt(0)}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{c.user?.displayName}</p>
                  <p className="text-white/30 text-[10px]">@{c.user?.username}</p>
                </div>

                {/* Tier badge */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tier.bg}`}>
                  <TierIcon className={`w-3 h-3 ${tier.color}`} />
                  <span className={`text-[9px] font-bold ${tier.color}`}>{c.tierName.replace('_', ' ')}</span>
                </div>

                {/* Weight score */}
                <div className="text-right">
                  <p className="text-white/20 text-[9px]">Score</p>
                  <p className="text-white/50 text-xs font-bold">{Math.round(c.weightScore)}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Send invites button */}
      {selected.size > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSendInvites}
          disabled={sending}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-brand-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Invites ({selected.size}/{maxGuests})
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

/** Search-as-you-type invite — searches users and invites directly */
function DirectInviteInput({ streamId, onInvited }: { streamId: string; onInvited: (userId: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    setShowResults(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const cleaned = value.trim().replace('@', '');
    if (cleaned.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(cleaned)}`);
        const data = await res.json();
        setResults((data.users || []).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleInvite(user: SearchUser) {
    if (sending || invited.has(user.id)) return;
    setSending(user.id);
    try {
      await apiFetch(`/api/streams/${streamId}/suite/invite-by-username`, {
        method: 'POST',
        body: JSON.stringify({ username: user.username }),
      });
      setInvited(prev => new Set([...prev, user.id]));
      onInvited(user.id);
    } catch (err: any) {
      alert(err.message || 'Failed to invite');
    } finally {
      setSending(null);
    }
  }

  // Need useRef for debounce
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 relative">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Invite by Name</span>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search by name or @username..."
          className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400 animate-spin" />
        )}
      </div>

      {/* Search results dropdown */}
      {showResults && query.trim().length >= 2 && (
        <div className="mt-1.5 rounded-lg bg-surface-dark border border-white/10 overflow-hidden max-h-[240px] overflow-y-auto shadow-xl">
          {results.length === 0 && !searching && (
            <div className="px-3 py-4 text-center">
              <p className="text-white/30 text-[10px]">No users found for "{query.trim()}"</p>
            </div>
          )}
          {results.map(user => {
            const isInvited = invited.has(user.id);
            const isSending = sending === user.id;
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.04] last:border-b-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => !isInvited && handleInvite(user)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/40">
                      {user.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user.displayName}</p>
                  <p className="text-white/30 text-[10px]">@{user.username}</p>
                </div>
                {isInvited ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    <Check className="w-3 h-3" /> Invited
                  </span>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    disabled={isSending}
                    className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"
                  >
                    {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Invite</>}
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
