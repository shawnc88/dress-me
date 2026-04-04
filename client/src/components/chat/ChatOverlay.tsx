import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Wifi, WifiOff, Crown, Star, Sparkles, Gift } from 'lucide-react';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useStreamSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { haptic } from '@/utils/native';

const GIFT_CONFIG: Record<string, { emoji: string; name: string; tier: 'small' | 'mid' | 'big' }> = {
  heart:     { emoji: '❤️', name: 'Heart',     tier: 'small' },
  rose:      { emoji: '🌹', name: 'Rose',      tier: 'small' },
  outfit:    { emoji: '👗', name: 'Outfit',    tier: 'mid' },
  spotlight: { emoji: '🔥', name: 'Spotlight', tier: 'mid' },
  crown:     { emoji: '👑', name: 'VIP Crown', tier: 'big' },
  diamond:   { emoji: '💎', name: 'Diamond',   tier: 'big' },
};

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
    haptic('light');
    socketSend(input.trim());
    setInput('');
  };

  // ─── Sidebar mode (desktop chat panel) ───
  if (sidebar) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
          {isConnected ? (
            <><Wifi className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400">Live Chat</span></>
          ) : (
            <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-[10px] text-gray-500">Connecting...</span></>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No messages yet. Say hi!</p>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} mode="sidebar" />
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
                maxLength={500}
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

  // ─── Mobile overlay mode ───
  return (
    <div>
      <div ref={scrollRef} className="space-y-1.5 mb-3">
        <AnimatePresence initial={false}>
          {messages.slice(-8).map((msg) => (
            <MessageBubble key={msg.id} msg={msg} mode="overlay" />
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
            maxLength={500}
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

// ─── Message Bubble Component ───

function MessageBubble({ msg, mode }: { msg: ChatMessage; mode: 'sidebar' | 'overlay' }) {
  // Gift message — bold animated card
  if (msg.type === 'gift') {
    const gift = GIFT_CONFIG[msg.giftType || ''] || { emoji: '🎁', name: msg.giftType || 'Gift', tier: 'small' as const };
    const isBig = gift.tier === 'big';
    const isMid = gift.tier === 'mid';

    // Style tiers: big gifts (crown/diamond) get full-width glow, mid get accent, small get subtle
    const bgClass = isBig
      ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-amber-400/40'
      : isMid
        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 border-amber-500/25'
        : 'bg-amber-500/10 border-amber-500/15';

    if (mode === 'overlay') {
      return (
        <motion.div
          initial={{ opacity: 0, x: -30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className={`rounded-2xl px-3 py-2 border backdrop-blur-sm ${bgClass} ${isBig ? 'max-w-[95%]' : 'max-w-[90%]'}`}
        >
          <div className="flex items-center gap-2">
            <span className={isBig ? 'text-2xl' : isMid ? 'text-xl' : 'text-lg'}>{gift.emoji}</span>
            <div className="flex-1 min-w-0">
              <span className={`font-extrabold ${isBig ? 'text-sm text-amber-200' : 'text-xs text-amber-300'}`}>
                {msg.displayName}
              </span>
              <span className={`${isBig ? 'text-xs text-amber-100' : 'text-[10px] text-amber-200/70'} ml-1`}>
                sent {(msg.threads || 0).toLocaleString()} threads!
              </span>
            </div>
          </div>
          {isBig && (
            <p className="text-amber-300/80 text-[10px] font-bold mt-0.5 pl-9">{gift.emoji} {gift.name} gift!</p>
          )}
          {msg.content && (
            <p className="text-white/60 text-[10px] mt-0.5 pl-9 italic">{msg.content}</p>
          )}
        </motion.div>
      );
    }

    // Sidebar gift
    return (
      <div className={`rounded-xl px-3 py-2 border ${bgClass}`}>
        <div className="flex items-center gap-2">
          <span className={isBig ? 'text-xl' : 'text-lg'}>{gift.emoji}</span>
          <span className={`font-bold ${isBig ? 'text-sm text-amber-200' : 'text-xs text-amber-300'}`}>
            {msg.displayName}
          </span>
          <span className="text-amber-200/60 text-[10px]">
            sent {(msg.threads || 0).toLocaleString()} threads!
          </span>
        </div>
        {isBig && (
          <p className="text-amber-300/70 text-[10px] font-bold mt-0.5 pl-8">{gift.emoji} {gift.name} gift!</p>
        )}
        {msg.content && <p className="text-white/50 text-[10px] mt-0.5 pl-8 italic">{msg.content}</p>}
      </div>
    );
  }

  // System message
  if (msg.type === 'system' || msg.role === 'SYSTEM') {
    if (mode === 'overlay') {
      return (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="text-white/30 text-[10px] pl-1"
        >
          {msg.content}
        </motion.div>
      );
    }
    return (
      <div className="text-white/30 text-xs italic">{msg.content}</div>
    );
  }

  // Regular text message
  if (mode === 'overlay') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="inline-flex items-start gap-1.5 bg-black/30 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[85%]"
      >
        {/* Avatar */}
        {msg.avatarUrl && (
          <img src={msg.avatarUrl} alt="" className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 flex-wrap">
            <span className={`font-bold text-xs whitespace-nowrap ${nameColor(msg.role)}`}>
              {msg.displayName}
            </span>
            <BadgeTag role={msg.role} badge={msg.badge} />
          </span>
          <span className="text-xs text-white/90 ml-1">{msg.content}</span>
        </div>
      </motion.div>
    );
  }

  // Sidebar text message
  return (
    <div className="animate-slide-up flex items-start gap-2">
      {msg.avatarUrl && (
        <img src={msg.avatarUrl} alt="" className="w-6 h-6 rounded-full mt-0.5 flex-shrink-0" />
      )}
      <div>
        <span className="inline-flex items-center gap-1">
          <span className={`font-semibold text-sm ${nameColor(msg.role)}`}>{msg.displayName}</span>
          <BadgeTag role={msg.role} badge={msg.badge} />
        </span>
        <span className="text-sm text-gray-300 ml-2">{msg.content}</span>
      </div>
    </div>
  );
}

// ─── Badge Component ───

function BadgeTag({ role, badge }: { role: string; badge?: string | null }) {
  // Creator badge always takes priority
  if (role === 'CREATOR') {
    return <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-brand-500/20 text-brand-400 leading-none">HOST</span>;
  }
  if (role === 'MODERATOR') {
    return <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-green-500/20 text-green-400 leading-none">MOD</span>;
  }

  // Subscription badges
  if (badge === 'INNER_CIRCLE') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold bg-amber-500/20 text-amber-400 leading-none">
        <Sparkles className="w-2 h-2" />IC
      </span>
    );
  }
  if (badge === 'VIP') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold bg-violet-500/20 text-violet-400 leading-none">
        <Crown className="w-2 h-2" />VIP
      </span>
    );
  }
  if (badge === 'SUPPORTER') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold bg-brand-500/10 text-brand-300 leading-none">
        <Star className="w-2 h-2" />SUP
      </span>
    );
  }

  return null;
}

function nameColor(role: string): string {
  switch (role) {
    case 'CREATOR': return 'text-brand-500';
    case 'MODERATOR': return 'text-green-400';
    default: return 'text-gray-400';
  }
}
