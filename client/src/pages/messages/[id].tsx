import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
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
        .then(d => { if (d?.messages) setMessages(d.messages); })
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

    const token = localStorage.getItem('token');
    if (!token) return;

    // We need the other user's ID — get it from the first message that isn't ours
    const otherMsg = messages.find(m => m.senderId !== myUserId);
    const recipientId = otherMsg?.senderId;

    if (!recipientId && messages.length === 0) {
      // No messages yet — can't determine recipient from conversation alone
      // The send API needs recipientId, but we can also send with conversationId
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
      }
    } catch {}
    setSending(false);
  }

  const otherUser = messages.find(m => m.senderId !== myUserId)?.sender;

  return (
    <>
      <Head><title>{otherUser?.displayName || 'Chat'} - Dress Me</title></Head>
      <div className="fixed inset-0 bg-surface-dark flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 safe-area-pt">
          <button onClick={() => router.push('/messages')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          {otherUser && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                    {otherUser.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{otherUser.displayName}</p>
                <p className="text-white/30 text-[10px]">@{otherUser.username}</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-500 animate-spin" /></div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === myUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                  isMe
                    ? 'bg-brand-500 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isMe ? 'text-white/50' : 'text-white/20'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/5 safe-area-pb">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center disabled:opacity-30"
            >
              <Send className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
