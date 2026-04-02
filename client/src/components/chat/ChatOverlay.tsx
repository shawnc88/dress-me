import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Wifi, WifiOff } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useStreamSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

export function ChatOverlay({ streamId, sidebar }: { streamId: string; sidebar?: boolean }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((s) => s.token);
  const messages = useChatStore((s) => s.messages);
  const isConnected = useChatStore((s) => s.isConnected);
  const { sendMessage: socketSend } = useStreamSocket(streamId, token);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !token) return;
    socketSend(input.trim());
    setInput('');
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'CREATOR': return 'text-brand-500';
      case 'PREMIUM': return 'text-violet-deep';
      case 'ELITE': return 'text-amber-400';
      case 'MODERATOR': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'CREATOR') return <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold bg-brand-500/20 text-brand-400">HOST</span>;
    if (role === 'ELITE') return <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400">VIP</span>;
    if (role === 'PREMIUM') return <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold bg-violet-deep/20 text-violet-deep">PRO</span>;
    return null;
  };

  // Sidebar mode (desktop chat panel)
  if (sidebar) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Connection status */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
          {isConnected ? (
            <><Wifi className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400">Live Chat</span></>
          ) : (
            <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-[10px] text-gray-500">Connecting...</span></>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No messages yet. Say hi!</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="animate-slide-up">
              <span className={`font-semibold text-sm ${msg.role === 'SYSTEM' ? 'text-white/40 italic' : roleColor(msg.role)}`}>
                {msg.displayName}
              </span>
              {msg.role !== 'SYSTEM' && roleBadge(msg.role)}
              <span className={`text-sm ml-2 ${msg.role === 'SYSTEM' ? 'text-white/40 italic' : 'text-gray-300'}`}>{msg.content}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
          {!token ? (
            <p className="text-gray-500 text-sm text-center">Log in to chat</p>
          ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              className="flex-1 bg-white/5 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-600
                         focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={sendMessage}
              className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </motion.button>
          </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile overlay mode — glass pill messages
  return (
    <div>
      <div ref={scrollRef} className="space-y-1.5 mb-3">
        <AnimatePresence initial={false}>
          {messages.slice(-5).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-baseline gap-1 bg-black/30 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[85%]"
            >
              <span className={`font-bold text-xs whitespace-nowrap ${msg.role === 'SYSTEM' ? 'text-white/40' : roleColor(msg.role)}`}>
                {msg.displayName}
              </span>
              {msg.role !== 'SYSTEM' && roleBadge(msg.role)}
              <span className={`text-xs ${msg.role === 'SYSTEM' ? 'text-white/50 italic' : 'text-white/90'}`}>{msg.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {token ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Say something..."
            className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-full px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-1 focus:ring-brand-500/50 backdrop-blur-md"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      ) : (
        <p className="text-white/30 text-xs text-center py-1">Log in to chat</p>
      )}
    </div>
  );
}
