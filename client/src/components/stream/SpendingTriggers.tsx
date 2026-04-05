import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Crown, Coins, Video, Eye, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { haptic } from '@/utils/native';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

interface SpendingTriggersProps {
  streamId: string;
  onGift: () => void;
  onBuyCoins: () => void;
  onSubscribe?: () => void;
  creatorName: string;
  threadBalance: number;
}

interface Trigger {
  id: string;
  icon: any;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  cta: string;
  action: 'gift' | 'buy' | 'subscribe';
}

/**
 * Smart spending triggers that fire at emotional peaks during live streams.
 * Manages a queue of contextual prompts with dedup and cooldown.
 */
export function SpendingTriggers({
  streamId, onGift, onBuyCoins, onSubscribe, creatorName, threadBalance,
}: SpendingTriggersProps) {
  const [activeTrigger, setActiveTrigger] = useState<Trigger | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const lastDismissRef = useRef(0);
  const giftCountRef = useRef(0);
  const messages = useChatStore((s) => s.messages);
  const { track } = useMonetizationEvents();

  const COOLDOWN_MS = 45_000; // 45s between triggers

  const fire = useCallback((trigger: Trigger) => {
    if (firedRef.current.has(trigger.id)) return;
    if (Date.now() - lastDismissRef.current < COOLDOWN_MS) return;

    firedRef.current.add(trigger.id);
    haptic('light');
    setActiveTrigger(trigger);

    // Track prompt shown
    const eventName = trigger.id === 'low_balance' ? 'low_balance_prompt_shown'
      : trigger.id === 'vip_upsell' ? 'vip_prompt_shown'
      : 'gift_prompt_shown';
    track(eventName as any, { triggerId: trigger.id, streamId });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setActiveTrigger(prev => prev?.id === trigger.id ? null : prev);
    }, 8000);
  }, [track, streamId]);

  const dismiss = useCallback(() => {
    if (activeTrigger) {
      const eventName = activeTrigger.id === 'vip_upsell' ? 'vip_prompt_dismissed' : 'gift_prompt_dismissed';
      track(eventName as any, { triggerId: activeTrigger.id, streamId });
    }
    lastDismissRef.current = Date.now();
    setActiveTrigger(null);
  }, [activeTrigger, track, streamId]);

  const handleCTA = useCallback(() => {
    if (!activeTrigger) return;
    haptic('medium');
    const eventName = activeTrigger.id === 'vip_upsell' ? 'vip_prompt_clicked' : 'gift_prompt_clicked';
    track(eventName as any, { triggerId: activeTrigger.id, streamId });
    if (activeTrigger.action === 'gift') onGift();
    else if (activeTrigger.action === 'buy') onBuyCoins();
    else if (activeTrigger.action === 'subscribe') onSubscribe?.();
    dismiss();
  }, [activeTrigger, onGift, onBuyCoins, onSubscribe, dismiss, track, streamId]);

  // ─── TRIGGER 1: After 25s watch time ───
  useEffect(() => {
    const timer = setTimeout(() => {
      fire({
        id: 'watch_25s',
        icon: Gift,
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-500/20',
        bgColor: 'bg-amber-500/10',
        title: 'Enjoying the stream?',
        subtitle: `Send ${creatorName} your first gift`,
        cta: 'Send Gift',
        action: 'gift',
      });
    }, 25_000);
    return () => clearTimeout(timer);
  }, [creatorName, fire]);

  // ─── TRIGGER 2: After first gift sent ───
  useEffect(() => {
    const giftMessages = messages.filter(m => m.type === 'gift');
    if (giftMessages.length > giftCountRef.current) {
      giftCountRef.current = giftMessages.length;

      // Check if any gift was from current user
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      const myGifts = giftMessages.filter(m => m.username === me.username);

      if (myGifts.length === 1) {
        // First gift → "you're close to Top Supporter"
        setTimeout(() => {
          fire({
            id: 'first_gift',
            icon: Crown,
            iconColor: 'text-violet-400',
            borderColor: 'border-violet-500/20',
            bgColor: 'bg-violet-500/10',
            title: 'You\'re close to Top Supporter!',
            subtitle: 'Send another gift to climb the leaderboard',
            cta: 'Send More',
            action: 'gift',
          });
        }, 5000);
      }
    }
  }, [messages, fire]);

  // ─── TRIGGER 3: Creator mentioned viewer (creator replied in chat) ───
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'CREATOR' || lastMsg.type !== 'text') return;

    const me = JSON.parse(localStorage.getItem('user') || '{}');
    if (!me.username) return;

    // Check if creator mentioned any viewer name
    if (lastMsg.content.toLowerCase().includes(me.displayName?.toLowerCase() || '') ||
        lastMsg.content.toLowerCase().includes(me.username?.toLowerCase() || '')) {
      setTimeout(() => {
        fire({
          id: 'creator_noticed',
          icon: Eye,
          iconColor: 'text-brand-400',
          borderColor: 'border-brand-500/20',
          bgColor: 'bg-brand-500/10',
          title: `${creatorName} noticed you!`,
          subtitle: 'Keep the momentum — send a gift',
          cta: 'Send Gift',
          action: 'gift',
        });
      }, 3000);
    }
  }, [messages, creatorName, fire]);

  // ─── TRIGGER 4: Low balance warning (after spending) ───
  useEffect(() => {
    if (threadBalance > 0 && threadBalance < 50 && giftCountRef.current > 0) {
      fire({
        id: 'low_balance',
        icon: Coins,
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-500/20',
        bgColor: 'bg-amber-500/10',
        title: 'Running low on threads!',
        subtitle: `Only ${threadBalance} left — refill to keep gifting`,
        cta: 'Get Threads',
        action: 'buy',
      });
    }
  }, [threadBalance, fire]);

  // ─── TRIGGER 5: VIP upsell (after 2 minutes + engagement) ───
  useEffect(() => {
    const timer = setTimeout(() => {
      if (giftCountRef.current >= 1 && onSubscribe) {
        fire({
          id: 'vip_upsell',
          icon: Video,
          iconColor: 'text-violet-400',
          borderColor: 'border-violet-500/20',
          bgColor: 'bg-violet-500/10',
          title: 'Want to join them live?',
          subtitle: 'VIPs get picked for Suite interaction',
          cta: 'Go VIP',
          action: 'subscribe',
        });
      }
    }, 120_000);
    return () => clearTimeout(timer);
  }, [onSubscribe, fire]);

  return (
    <AnimatePresence>
      {activeTrigger && (
        <motion.div
          key={activeTrigger.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute bottom-44 left-4 right-16 z-40"
        >
          <div className={`bg-black/70 backdrop-blur-xl rounded-2xl p-3 border ${activeTrigger.borderColor} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl ${activeTrigger.bgColor} flex items-center justify-center flex-shrink-0`}>
              <activeTrigger.icon className={`w-5 h-5 ${activeTrigger.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">{activeTrigger.title}</p>
              <p className="text-white/40 text-[10px]">{activeTrigger.subtitle}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCTA}
              className={`px-3 py-2 rounded-lg ${activeTrigger.bgColor} border ${activeTrigger.borderColor} ${activeTrigger.iconColor} text-xs font-bold flex-shrink-0`}
            >
              {activeTrigger.cta}
            </motion.button>
            <button onClick={dismiss} className="text-white/20 text-sm leading-none">&times;</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
