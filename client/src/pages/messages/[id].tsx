import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Smile } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Curated quick-emoji rows — native glyphs, no library. Ordered by chat energy.
const EMOJI_ROWS: string[][] = [
  ['😂', '🤣', '😍', '🥰', '😘', '😎', '🥹', '😭'],
  ['❤️', '💜', '🔥', '✨', '💯', '🎉', '👑', '💎'],
  ['👍', '🙌', '👏', '🤝', '💪', '🫶', '🙏', '👀'],
  ['😅', '😉', '🤩', '😏', '🤔', '😴', '🥳', '😇'],
  ['🎁', '🌹', '💐', '🍀', '⭐', '🌙', '☀️', '🌈'],
  ['🎵', '🎮', '🍳', '🏋️', '🎨', '📚', '⚽', '💃'],
];

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

export default function ChatPage() {
  const router = useRouter();
  const { id: conversationId } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Message['sender'] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setMyUserId(JSON.parse(stored).id); } catch {}
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    function fetchMessages() {
      fetch(`${API_URL}/api/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.messages) setMessages(d.messages);
          if (d?.otherUser) setOtherUser(d.otherUser);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    fetchMessages();
    // Poll for new messages every 5s
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conversationId, router]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending || !conversationId) return;
    setSending(true);
    setSendError('');

    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    // Recipient comes from the conversation itself (server-provided) — never
    // inferred from the message list, which fails when every message is mine.
    const recipientId = otherUser?.id || messages.find(m => m.senderId !== myUserId)?.senderId;
    if (!recipientId) {
      setSendError("Couldn't load this conversation — pull to refresh and try again.");
      setSending(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId, content: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setText('');
        setShowEmoji(false);
      } else {
        const data = await res.json().catch(() => null);
        setSendError(data?.error?.message || "Message didn't send — try again.");
      }
    } catch {
      setSendError('No connection — check your internet and try again.');
    }
    setSending(false);
  }

  return (
    <>
      <Head><title>{otherUser?.displayName || 'Chat'} - Be With Me</title></Head>
      <div className="fixed inset-0 celebration-canvas flex flex-col">

        {/* ─── Slim header ─── */}
        <div className="relative flex items-center gap-3 px-4 py-3 bg-ink-950/85 backdrop-blur-2xl safe-area-pt flex-shrink-0">
          <button
            onClick={() => router.push('/messages')}
            className="w-11 h-11 min-w-[44px] rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-150 no-select"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          {otherUser && (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-ink-800 ring-1 ring-brand-500/40 flex-shrink-0">
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/70">
                    {otherUser.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-[15px] font-bold tracking-tight truncate">{otherUser.displayName}</p>
                <p className="text-white/35 text-[11px] tracking-wide">@{otherUser.username}</p>
              </div>
            </div>
          )}

          {/* neon hairline seam */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/25 via-accent-violet/30 to-accent-cyan/25"
            aria-hidden
          />
        </div>

        {/* ─── Message thread ─── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="relative w-10 h-10 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-xl animate-glow-breathe" />
                <div className="absolute inset-1 rounded-full neon-hairline flex items-center justify-center animate-float">
                  <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                </div>
              </div>
            </div>
          )}

          {messages.map(msg => {
            const isMe = msg.senderId === myUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? 'rounded-br-sm text-white'
                      : 'bg-white/[0.07] backdrop-blur-xl border border-white/10 text-white rounded-bl-sm'
                  }`}
                  style={isMe ? {
                    background: 'linear-gradient(135deg, #FF4FA3 0%, #b23aa0 50%, #7C5CFF 100%)',
                    boxShadow: '0 4px 16px -4px rgba(255,79,163,0.4)',
                  } : undefined}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[11px] mt-1 ${isMe ? 'text-white/50' : 'text-white/25'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Glass composer bar ─── */}
        <div className="flex-shrink-0 px-4 py-3 bg-ink-950/85 backdrop-blur-2xl border-t border-white/[0.08] safe-area-pb">
          {/* neon hairline top seam */}
          <div
            className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/20 via-accent-violet/25 to-accent-cyan/20"
            aria-hidden
          />
          {sendError && (
            <p className="text-live text-xs font-medium text-center mb-2">{sendError}</p>
          )}
          {showEmoji && (
            <div className="mb-2.5 rounded-2xl bg-white/[0.04] border border-white/10 p-2.5 space-y-1">
              {EMOJI_ROWS.map((row, i) => (
                <div key={i} className="flex justify-between">
                  {row.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setText(t => t + e)}
                      className="w-10 h-10 rounded-xl text-2xl leading-none flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all no-select"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              aria-label="Emoji"
              className={`w-11 h-11 min-w-[44px] rounded-full flex items-center justify-center border transition-all no-select ${
                showEmoji
                  ? 'bg-brand-500/20 border-brand-400/50 text-brand-400'
                  : 'bg-white/[0.06] border-white/10 text-white/45 hover:text-white/75'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Say something…"
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center disabled:opacity-30 transition-all duration-200 no-select"
              style={{
                background: 'linear-gradient(135deg, #FF4FA3 0%, #7C5CFF 100%)',
                boxShadow: text.trim() ? '0 0 16px rgba(255,79,163,0.45)' : 'none',
              }}
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
