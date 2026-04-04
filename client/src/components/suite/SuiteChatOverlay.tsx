import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { io as ioClient, Socket } from 'socket.io-client';
import { haptic } from '@/utils/native';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SuiteChatMessage {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  suiteRole: 'host' | 'guest';
  content: string;
  timestamp: string;
}

interface SuiteChatOverlayProps {
  suiteId: string;
}

export function SuiteChatOverlay({ suiteId }: SuiteChatOverlayProps) {
  const [messages, setMessages] = useState<SuiteChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !suiteId) return;

    const socket = ioClient(`${API_URL}/suite`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-suite', { suiteId });
    });

    socket.on('disconnect', () => setConnected(false));

    // Chat messages
    socket.on('suite-chat-message', (msg: SuiteChatMessage) => {
      setMessages(prev => [...prev.slice(-100), msg]);
    });

    // System events → show as chat messages
    socket.on('guest-joined', (data: { userId: string; displayName: string }) => {
      setMessages(prev => [...prev.slice(-100), {
        id: `sys-join-${Date.now()}`,
        userId: 'system',
        displayName: 'System',
        suiteRole: 'guest' as const,
        content: `${data.displayName} joined the Suite`,
        timestamp: new Date().toISOString(),
      }]);
    });

    socket.on('guest-departed', (data: { userId: string; reason: string }) => {
      setMessages(prev => [...prev.slice(-100), {
        id: `sys-leave-${Date.now()}`,
        userId: 'system',
        displayName: 'System',
        suiteRole: 'guest' as const,
        content: `A guest ${data.reason === 'removed' ? 'was removed' : 'left'} the Suite`,
        timestamp: new Date().toISOString(),
      }]);
    });

    socket.on('suite-chat-blocked', (data: { reason: string }) => {
      setMessages(prev => [...prev.slice(-100), {
        id: `sys-block-${Date.now()}`,
        userId: 'system',
        displayName: 'System',
        suiteRole: 'guest' as const,
        content: data.reason,
        timestamp: new Date().toISOString(),
      }]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [suiteId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, expanded]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !socketRef.current) return;
    haptic('light');
    socketRef.current.emit('suite-chat-message', { suiteId, content: input.trim() });
    setInput('');
  }, [input, suiteId]);

  return (
    <div className="absolute bottom-20 left-0 right-0 z-20 px-3 pointer-events-none">
      <div className="pointer-events-auto">
        {/* Toggle button */}
        <button
          onClick={() => { setExpanded(!expanded); haptic('light'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 mb-2"
        >
          <MessageCircle className="w-3 h-3 text-white/60" />
          <span className="text-white/60 text-[10px] font-medium">Suite Chat</span>
          {messages.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-violet-500 text-[8px] font-bold text-white flex items-center justify-center">
              {Math.min(messages.length, 99)}
            </span>
          )}
          {expanded ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronUp className="w-3 h-3 text-white/40" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {/* Messages */}
                <div ref={scrollRef} className="max-h-[200px] overflow-y-auto p-3 space-y-1.5">
                  {messages.length === 0 && (
                    <p className="text-white/20 text-[10px] text-center py-4">No messages yet</p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id}>
                      {msg.userId === 'system' ? (
                        <p className="text-white/25 text-[10px] italic">{msg.content}</p>
                      ) : (
                        <div className="flex items-start gap-1.5">
                          {msg.avatarUrl && (
                            <img src={msg.avatarUrl} alt="" className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className={`text-[10px] font-bold ${msg.suiteRole === 'host' ? 'text-violet-400' : 'text-white/60'}`}>
                              {msg.displayName}
                            </span>
                            {msg.suiteRole === 'host' && (
                              <span className="ml-1 px-1 py-0 rounded text-[7px] font-bold bg-violet-500/20 text-violet-400">HOST</span>
                            )}
                            <span className="text-white/80 text-[10px] ml-1">{msg.content}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2 p-2 border-t border-white/5">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Message the Suite..."
                    maxLength={300}
                    className="flex-1 bg-white/5 text-white placeholder-white/20 rounded-full px-3 py-1.5 text-[11px]
                               focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Send className="w-3 h-3 text-white" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Peek: show last message when collapsed */}
        {!expanded && messages.length > 0 && (
          <motion.div
            key={messages[messages.length - 1].id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5 max-w-[80%]"
          >
            <span className={`text-[10px] font-bold ${messages[messages.length - 1].suiteRole === 'host' ? 'text-violet-400' : 'text-white/50'}`}>
              {messages[messages.length - 1].displayName}
            </span>
            <span className="text-white/70 text-[10px] ml-1">
              {messages[messages.length - 1].content}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
