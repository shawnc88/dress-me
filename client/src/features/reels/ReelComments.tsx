import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string } | null;
}

interface ReelCommentsProps {
  reelId: string;
  onClose: () => void;
}

export function ReelComments({ reelId, onClose }: ReelCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/reels/${reelId}/comments`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.comments) setComments(data.comments); })
      .catch(() => {});
  }, [reelId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/reels/${reelId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (data?.comment) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setComments(prev => [{ ...data.comment, user }, ...prev]);
        setText('');
      }
    } catch {}
    setSending(false);
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-surface-dark/95 backdrop-blur-xl rounded-t-3xl max-h-[60vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white text-sm font-bold">{comments.length} Comments</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">No comments yet. Be the first!</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
              {c.user?.avatarUrl ? (
                <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/40">
                  {c.user?.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-semibold">@{c.user?.username || 'user'}</span>
                <span className="text-white/20 text-[10px]">
                  {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-white/70 text-sm mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5 safe-area-pb">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center disabled:opacity-30"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
