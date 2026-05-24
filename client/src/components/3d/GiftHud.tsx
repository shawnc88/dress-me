// HTML overlays layered above the r3f Canvas:
//   - Sender callout in the top-left (social proof — "your fans are watching
//     who sends what")
//   - Combo counter under the sender, escalating in size + color as the
//     same gift fires repeatedly (the Twitch hype-train mechanic)
//
// Plain CSS animations + Tailwind — no framer-motion needed for this. Lives
// OUTSIDE the Canvas so the bloom pass doesn't have to render through it.

export interface SenderInfo {
  username: string;
  avatarUrl?: string;
}

export interface ComboInfo {
  type: string;
  count: number;
}

interface GiftHudProps {
  sender: SenderInfo | null;
  combo: ComboInfo | null;
}

/** Color + size escalation for the combo badge — same idea as Bigo's combo
 *  rings or Twitch's hype-train tiers: the visual reward for stacking gifts
 *  has to *escalate* or stacking feels pointless. */
function comboTier(count: number) {
  if (count >= 25) return { label: `${count}× MASSIVE`, classes: 'bg-gradient-to-r from-pink-500 via-amber-400 to-rose-500 text-white text-xl scale-110 animate-pulse', emoji: '⚡' };
  if (count >= 10) return { label: `${count}× HYPE`, classes: 'bg-gradient-to-r from-amber-400 to-rose-500 text-white text-lg', emoji: '🔥' };
  if (count >= 5) return { label: `${count}× COMBO`, classes: 'bg-gradient-to-r from-amber-300 to-orange-500 text-white text-base', emoji: '✨' };
  return { label: `${count}× combo`, classes: 'bg-amber-300/90 text-amber-950 text-sm', emoji: '' };
}

export function GiftHud({ sender, combo }: GiftHudProps) {
  const showCombo = combo && combo.count >= 2;
  if (!sender && !showCombo) return null;

  const tier = showCombo ? comboTier(combo!.count) : null;

  return (
    <div className="pointer-events-none absolute top-4 left-4 z-[60] flex flex-col items-start gap-2">
      {sender && (
        <div className="flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-md px-3 py-1.5 text-sm text-white shadow-lg animate-fade-in">
          {sender.avatarUrl && (
            // Plain <img> on purpose — Next/Image inside an absolute-positioned
            // HUD over a video stream is overkill and adds layout cost we can't
            // afford during a gift moment.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sender.avatarUrl}
              alt=""
              className="size-6 rounded-full object-cover ring-1 ring-white/40"
            />
          )}
          <span className="font-semibold">@{sender.username}</span>
          <span className="text-amber-300/90">sent a gift</span>
        </div>
      )}
      {showCombo && tier && (
        <div
          key={combo!.count}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-bold shadow-lg transition-all ${tier.classes}`}
        >
          {tier.emoji && <span>{tier.emoji}</span>}
          <span className="tracking-wide">{tier.label}</span>
        </div>
      )}
    </div>
  );
}
