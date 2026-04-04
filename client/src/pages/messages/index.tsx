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
      <Head><title>Messages - Dress Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> Messages
        </h1>

        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No messages yet</p>
            <p className="text-white/15 text-xs mt-1">Start a conversation from a creator's profile</p>
          </div>
        )}

        <div className="space-y-1">
          {conversations.map(conv => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {conv.otherUser.avatarUrl ? (
                  <img src={conv.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/40">
                    {conv.otherUser.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-white/70'}`}>
                    {conv.otherUser.displayName}
                  </p>
                  <span className="text-white/20 text-[10px] flex-shrink-0 ml-2">
                    {timeAgo(conv.lastAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white/60' : 'text-white/30'}`}>
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
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
