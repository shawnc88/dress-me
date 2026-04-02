import { useState, useEffect, useRef } from 'react';
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // TODO: Connect Socket.IO when backend is running
  // For now, show placeholder messages
  useEffect(() => {
    setMessages([
      { id: '1', username: 'fashionlover', displayName: 'Fashion Lover', role: 'VIEWER', content: 'Love this outfit! 🔥', timestamp: new Date().toISOString() },
      { id: '2', username: 'styleguru', displayName: 'Style Guru', role: 'PREMIUM', content: 'The color combo is perfect', timestamp: new Date().toISOString() },
      { id: '3', username: 'creator1', displayName: 'Creator', role: 'CREATOR', content: 'Thanks everyone! Which shoes should I pair with this?', timestamp: new Date().toISOString() },
    ]);
  }, [streamId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    // TODO: Emit via Socket.IO
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        username: 'you',
        displayName: 'You',
        role: 'VIEWER',
        content: input,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'CREATOR': return 'text-brand-500';
      case 'PREMIUM': return 'text-purple-400';
      case 'ELITE': return 'text-amber-400';
      case 'MODERATOR': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (sidebar) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-slide-up">
              <span className={`font-semibold text-sm ${roleColor(msg.role)}`}>
                {msg.displayName}
              </span>
              <span className="text-sm ml-2">{msg.content}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={sendMessage} className="btn-primary !px-4 !py-2 text-sm">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile overlay mode
  return (
    <div className="chat-overlay">
      <div ref={scrollRef} className="space-y-2 mb-3">
        {messages.slice(-5).map((msg) => (
          <div key={msg.id} className="animate-slide-up">
            <span className={`font-semibold text-xs ${roleColor(msg.role)}`}>
              {msg.displayName}
            </span>
            <span className="text-white text-xs ml-1.5">{msg.content}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Say something..."
          className="flex-1 bg-white/20 text-white placeholder-white/50 rounded-full px-4 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 backdrop-blur-sm"
        />
        <button onClick={sendMessage} className="bg-brand-500 text-white rounded-full px-4 py-2 text-sm font-medium">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
