import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  role: string;
  content: string;
  timestamp: string;
}

export function ChatOverlay({ streamId, sidebar }: { streamId: string; sidebar?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([
      { id: '1', username: 'fashionlover', displayName: 'Fashion Lover', role: 'VIEWER', content: 'Love this outfit! 🔥', timestamp: new Date().toISOString() },
      { id: '2', username: 'styleguru', displayName: 'Style Guru', role: 'PREMIUM', content: 'The color combo is perfect', timestamp: new Date().toISOString() },
      { id: '3', username: 'creator1', displayName: 'Creator', role: 'CREATOR', content: 'Thanks everyone! Which shoes should I pair with this?', timestamp: new Date().toISOString() },
      { id: '4', username: 'vibes_queen', displayName: 'Vibes Queen', role: 'ELITE', content: 'Literally obsessed 😍', timestamp: new Date().toISOString() },
    ]);
  }, [streamId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), username: 'you', displayName: 'You', role: 'VIEWER', content: input, timestamp: new Date().toISOString() },
    ]);
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-slide-up">
              <span className={`font-semibold text-sm ${roleColor(msg.role)}`}>
                {msg.displayName}
              </span>
              {roleBadge(msg.role)}
              <span className="text-sm text-gray-300 ml-2">{msg.content}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
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
              <span className={`font-bold text-xs whitespace-nowrap ${roleColor(msg.role)}`}>
                {msg.displayName}
              </span>
              {roleBadge(msg.role)}
              <span className="text-white/90 text-xs">{msg.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
    </div>
  );
}
