import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Sparkles, X, ArrowUp } from 'lucide-react';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  creatorId: string;
  creatorName: string;
  onSubscribe: () => void;
  /** Where this prompt is rendered — used for analytics */
  source: 'profile' | 'live_room' | 'reel';
}

const TIER_MESSAGING: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  VIP: { icon: Crown, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'VIP' },
  INNER_CIRCLE: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Inner Circle' },
};

const REASON_COPY: Record<string, string> = {
  frequent_gifter: 'You gift often — get more with',
  frequent_viewer: 'You watch regularly — unlock more with',
};

export function UpgradePromptCard({ creatorId, creatorName, onSubscribe, source }: Props) {
  const [hint, setHint] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const { track } = useMonetizationEvents();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/monetization/upgrade-hint/${creatorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.shouldPrompt) {
          setHint(data);
          const event = data.suggestedAction === 'upgrade' ? 'vip_prompt_shown' : 'upgrade_prompt_shown';
          track(event as any, { creatorId, source, suggestedTier: data.suggestedTier });
        }
      })
      .catch(() => {});
  }, [creatorId, source, track]);

  if (!hint || dismissed) return null;

  const isUpgrade = hint.suggestedAction === 'upgrade';
  const tier = TIER_MESSAGING[hint.suggestedTier] || TIER_MESSAGING.VIP;
  const Icon = isUpgrade ? ArrowUp : Star;
  const reasonText = REASON_COPY[hint.reason] || "You're a fan — unlock more with";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        className={`rounded-2xl p-4 border relative overflow-hidden ${tier.border} ${tier.bg}`}
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-radial from-white/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <button
          onClick={() => {
            setDismissed(true);
            track(isUpgrade ? 'vip_prompt_dismissed' : 'upgrade_prompt_dismissed' as any, { creatorId, source });
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/20"
        >
          <X className="w-3 h-3" />
        </button>
        <div className="flex items-start gap-3 relative">
          <div className={`w-10 h-10 rounded-xl ${tier.bg} border ${tier.border} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${tier.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold mb-0.5">
              {isUpgrade
                ? `Upgrade to ${tier.label}`
                : `Subscribe to ${creatorName}`}
            </p>
            <p className="text-white/40 text-[10px] mb-2.5">
              {reasonText} {tier.label}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/30 mb-3">
              <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-violet-400" /> Suite priority</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> Exclusive badge</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                track(isUpgrade ? 'vip_upgrade_clicked' : 'upgrade_prompt_clicked' as any, {
                  creatorId, source, suggestedTier: hint.suggestedTier,
                });
                onSubscribe();
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold ${
                isUpgrade
                  ? 'bg-gradient-to-r from-violet-500 to-brand-500 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              }`}
            >
              {isUpgrade ? `Upgrade to ${tier.label}` : 'View Subscription Tiers'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
