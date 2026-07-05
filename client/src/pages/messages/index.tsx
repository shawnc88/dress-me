import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MessageCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ConvItem {
  id: string;
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null };
  lastMessage: string | null;
  lastAt: string;
  unreadCount: number;
}

export default function MessagesInbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${API_URL}/api/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.conversations) setConversations(d.conversations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <Layout>
      <Head><title>Messages - Be With Me</title></Head>

      <div className="min-h-screen celebration-canvas">
        {/* ─── Slim header ─── */}
        <div className="sticky top-0 z-40 bg-ink-950/85 backdrop-blur-2xl">
          <div className="max-w-[630px] mx-auto px-4 py-4 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-brand-400" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Messages
            </h1>
          </div>
          {/* neon hairline seam */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/25 via-accent-violet/30 to-accent-cyan/25"
            aria-hidden
          />
        </div>

        <div className="max-w-[630px] mx-auto px-4 pt-5 pb-24 safe-area-pb">
          {/* ─── Loading state ─── */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="relative w-12 h-12 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
                <div className="absolute inset-2 rounded-full neon-hairline animate-float flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                </div>
              </div>
            </div>
          )}

          {/* ─── Empty state ─── */}
          {!loading && conversations.length === 0 && (
            <div className="text-center pt-12 pb-16 animate-blur-in">
              <div className="relative w-20 h-20 mx-auto mb-5 pointer-events-none" aria-hidden>
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-20 blur-2xl animate-glow-breathe" />
                <div className="absolute inset-2 rounded-full neon-hairline flex items-center justify-center animate-float">
                  <MessageCircle className="w-6 h-6 text-accent-cyan" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                No messages <span className="text-celebration">yet</span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-[240px] mx-auto">
                Start a conversation from a creator&rsquo;s profile
              </p>
            </div>
          )}

          {/* ─── Conversation list ─── */}
          <div className="space-y-2 animate-rise">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-3.5 min-h-[72px] rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] transition-all duration-200 no-select"
              >
                {/* Avatar with brand ring accent for unread */}
                <div className={`relative flex-shrink-0 ${conv.unreadCount > 0 ? 'ring-creator' : ''}`}>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-ink-800 flex-shrink-0">
                    {conv.otherUser.avatarUrl ? (
                      <img src={conv.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/70">
                        {conv.otherUser.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[15px] font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-white/70'}`}>
                      {conv.otherUser.displayName}
                    </p>
                    <span className="text-white/30 text-[11px] flex-shrink-0 uppercase tracking-wide">
                      {timeAgo(conv.lastAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate leading-relaxed ${conv.unreadCount > 0 ? 'text-white/60' : 'text-white/30'}`}>
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 px-1.5 shadow-glow-sm">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
