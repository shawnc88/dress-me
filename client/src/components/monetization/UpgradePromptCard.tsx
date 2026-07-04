import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Sparkles, X, ArrowUp } from 'lucide-react';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';
import { TiltCard } from '@/components/3d/couture/TiltCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  creatorId: string;
  creatorName: string;
  onSubscribe: () => void;
  /** Where this prompt is rendered — used for analytics */
  source: 'profile' | 'live_room' | 'reel';
}

const TIER_MESSAGING: Record<string, { icon: any; color: string; badge: string; frame: string; elite: boolean; label: string }> = {
  VIP: {
    icon: Crown,
    color: 'text-violet-300',
    badge: 'bg-violet-500/15 border border-violet-500/25',
    frame: 'border border-violet-500/25',
    elite: false,
    label: 'VIP',
  },
  INNER_CIRCLE: {
    icon: Sparkles,
    color: 'text-gold-300',
    badge: 'bg-gold-300/15 border border-gold-300/25',
    frame: 'gold-hairline shadow-gold-sm',
    elite: true,
    label: 'Inner Circle',
  },
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
      <TiltCard intensity="subtle">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          className={`relative overflow-hidden rounded-4xl glass-couture ${tier.frame} p-4`}
        >
          {/* Ambient aura */}
          <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none ${tier.elite ? 'bg-gold-300/10' : 'bg-violet-500/12'}`} />
          {tier.elite && (
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent pointer-events-none" />
          )}

          <button
            onClick={() => {
              setDismissed(true);
              track(isUpgrade ? 'vip_prompt_dismissed' : 'upgrade_prompt_dismissed' as any, { creatorId, source });
            }}
            aria-label="Dismiss"
            className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center z-10"
          >
            <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30">
              <X className="w-3 h-3" />
            </span>
          </button>

          <div className="flex items-start gap-3.5 relative">
            <div className={`w-11 h-11 rounded-2xl ${tier.badge} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${tier.color}`} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <p className={`editorial text-lg leading-tight mb-1 ${tier.elite ? 'text-couture-gold' : 'text-white'}`}>
                {isUpgrade
                  ? `Ascend to ${tier.label}`
                  : `Subscribe to ${creatorName}`}
              </p>
              <p className="text-white/45 text-[10px] mb-2.5">
                {reasonText} {tier.label}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/35 mb-3.5">
                <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-violet-300" /> Suite priority</span>
                <span className="text-gold-300/40">·</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-gold-300" /> Exclusive badge</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  track(isUpgrade ? 'vip_upgrade_clicked' : 'upgrade_prompt_clicked' as any, {
                    creatorId, source, suggestedTier: hint.suggestedTier,
                  });
                  onSubscribe();
                }}
                className={`btn-couture w-full min-h-[44px] !py-3 text-xs ${tier.elite ? 'shadow-gold' : ''}`}
              >
                {isUpgrade ? `Upgrade to ${tier.label}` : 'View Subscription Tiers'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </TiltCard>
    </AnimatePresence>
  );
}
