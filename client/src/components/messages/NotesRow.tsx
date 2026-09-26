import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Plus, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Notes — the presence row above the DM inbox ─────────────────
// "going live at 9 🔥" above every follower's messages panel. Costs a
// creator one tap; fills tonight's room. 60 chars, 24h, one per user.

interface NoteItem {
  id: string;
  text: string;
  mine: boolean;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null };
}

export function NotesRow() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoaded(true); return; }
    fetch(`${API_URL}/api/notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.notes) setNotes(d.notes); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const mine = notes.find(n => n.mine);

  function saveNote() {
    // JS validation only — no `required` attrs (WKWebView bubble rule).
    const text = draft.trim();
    if (!text) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    setSaving(true);
    fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: text.slice(0, 60) }),
    })
      .then(r => { if (r.ok) { setComposing(false); setDraft(''); load(); } })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function clearNote() {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/notes/mine`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(() => load())
      .catch(() => {});
  }

  function openThread(userId: string) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${API_URL}/api/messages/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipientId: userId }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.conversationId) router.push(`/messages/${d.conversationId}`); })
      .catch(() => {});
  }

  if (!loaded) return null;

  return (
    <div className="mb-4">
      <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-1">
        {/* My note / composer */}
        <div className="flex flex-col items-center flex-shrink-0 w-[72px]">
          <div className="relative">
            {mine && !composing ? (
              <button
                onClick={clearNote}
                className="relative block no-select"
                aria-label="Clear your note"
              >
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 w-[88px] rounded-2xl bg-white/[0.08] border border-white/15 px-2 py-1.5 text-[11px] text-primary leading-snug text-center line-clamp-2 backdrop-blur-md">
                  {mine.text}
                </span>
                <span className="block w-14 h-14 mt-9 rounded-full overflow-hidden bg-ink-800 border border-white/15">
                  {mine.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mine.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-primary font-bold">
                      {mine.user.displayName.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-ink-800 border border-white/20 flex items-center justify-center">
                  <X className="w-3 h-3 text-secondary" />
                </span>
              </button>
            ) : (
              <button
                onClick={() => setComposing(true)}
                className="block w-14 h-14 mt-9 rounded-full border-2 border-dashed border-white/20 bg-white/[0.04] flex items-center justify-center no-select"
                aria-label="Leave a note"
              >
                <Plus className="w-5 h-5 text-tertiary" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-tertiary mt-1.5">{mine && !composing ? 'Your note' : 'Note'}</span>
        </div>

        {/* Followed creators' notes */}
        {notes.filter(n => !n.mine).map(n => (
          <button
            key={n.id}
            onClick={() => openThread(n.user.id)}
            className="flex flex-col items-center flex-shrink-0 w-[72px] no-select"
          >
            <div className="relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 w-[88px] rounded-2xl bg-white/[0.08] border border-white/15 px-2 py-1.5 text-[11px] text-primary leading-snug text-center line-clamp-2 backdrop-blur-md">
                {n.text}
              </span>
              <span className="block w-14 h-14 mt-9 rounded-full overflow-hidden bg-ink-800 border border-white/15">
                {n.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-primary font-bold">
                    {n.user.displayName.charAt(0)}
                  </span>
                )}
              </span>
            </div>
            <span className="text-[11px] text-tertiary mt-1.5 truncate w-full text-center">{n.user.displayName}</span>
          </button>
        ))}
      </div>

      {/* Inline composer */}
      {composing && (
        <div className="mt-6 flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 60))}
            placeholder="going live at 9 🔥"
            autoFocus
            className="flex-1 min-h-[44px] rounded-full bg-white/[0.06] border border-white/15 px-4 text-white text-sm placeholder:text-decorative focus:outline-none focus:border-brand-400/50"
          />
          <span className="text-decorative text-[11px] tabular-nums w-8 text-center">{60 - draft.length}</span>
          <button
            onClick={saveNote}
            disabled={saving || !draft.trim()}
            className="min-h-[44px] px-5 rounded-full bg-brand-500 text-white text-sm font-bold disabled:opacity-40 no-select"
          >
            {saving ? '…' : 'Post'}
          </button>
          <button
            onClick={() => { setComposing(false); setDraft(''); }}
            aria-label="Cancel"
            className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-tertiary no-select"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
