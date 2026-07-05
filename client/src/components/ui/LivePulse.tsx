'use client';

import { motion } from 'framer-motion';

// LIVE indicator that actually feels live — pulsing radial halo + inner
// white dot. Drops into any stream-card / stream-view header. The pulse
// cadence matches a relaxed heartbeat (~1.6s) so it reads as energy
// rather than a flashing warning.

export type LivePulseSize = 'sm' | 'md' | 'lg';

interface LivePulseProps {
  size?: LivePulseSize;
  label?: string;
  /** Hide the text and show just the dot — useful for compact tile overlays. */
  iconOnly?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<LivePulseSize, { container: string; dot: string }> = {
  sm: { container: 'gap-1 px-1.5 py-0.5 text-[11px]', dot: 'h-1.5 w-1.5' },
  md: { container: 'gap-1.5 px-2.5 py-1 text-xs', dot: 'h-2 w-2' },
  lg: { container: 'gap-2 px-3 py-1.5 text-sm', dot: 'h-2.5 w-2.5' },
};

export function LivePulse({
  size = 'md',
  label = 'LIVE',
  iconOnly = false,
  className = '',
}: LivePulseProps) {
  const sz = SIZE_CLASSES[size];
  const inner = (
    <span className={`relative inline-flex ${sz.dot}`}>
      <motion.span
        className="absolute inset-0 rounded-full bg-rose-400"
        animate={{ scale: [1, 2.4, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <span className={`relative inline-flex rounded-full bg-white ${sz.dot}`} />
    </span>
  );

  if (iconOnly) {
    return (
      <span className={`relative inline-flex items-center justify-center ${className}`}>
        {inner}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center rounded-full bg-rose-600 font-bold tracking-wider text-white shadow-lg shadow-rose-600/30 ${sz.container} ${className}`}
    >
      {inner}
      <span>{label}</span>
    </span>
  );
}
