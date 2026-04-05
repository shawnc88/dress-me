import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { useMonetizationEvents } from '@/hooks/useMonetizationEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  creatorId: string;
  /** Which tier to show scarcity for. Defaults to INNER_CIRCLE */
  tierName?: string;
}

export function ScarcityBadge({ creatorId, tierName = 'INNER_CIRCLE' }: Props) {
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null);
  const { track } = useMonetizationEvents();

  useEffect(() => {
    fetch(`${API_URL}/api/monetization/scarcity/${creatorId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const tier = data?.tiers?.find((t: any) => t.name === tierName);
        if (tier?.slotsRemaining !== null && tier?.slotsRemaining !== undefined && tier.slotsRemaining <= 10) {
          setSlotsRemaining(tier.slotsRemaining);
          track('scarcity_badge_seen', { creatorId, tierName, slotsRemaining: tier.slotsRemaining });
        }
      })
      .catch(() => {});
  }, [creatorId, tierName, track]);

  if (slotsRemaining === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
    >
      {slotsRemaining === 0 ? (
        <>
          <Lock className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300 text-[10px] font-bold">Inner Circle FULL</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300 text-[10px] font-bold">
            Only {slotsRemaining} Inner Circle {slotsRemaining === 1 ? 'spot' : 'spots'} left
          </span>
        </>
      )}
    </motion.div>
  );
}
