import { motion } from 'framer-motion';

interface AnimatedLiveBadgeProps {
  viewerCount?: number;
  compact?: boolean;
}

export function AnimatedLiveBadge({ viewerCount, compact = false }: AnimatedLiveBadgeProps) {
  if (compact) {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-live text-white shadow-glow-live"
      >
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-1.5 h-1.5 bg-white rounded-full"
        />
        LIVE
      </motion.span>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5"
    >
      <span className="flex items-center gap-1.5">
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-live rounded-full"
        />
        <span className="text-xs font-bold text-live">LIVE</span>
      </span>
      {viewerCount !== undefined && (
        <>
          <span className="text-white/30 text-[10px]">|</span>
          <span className="text-white/70 text-xs font-medium">
            {viewerCount.toLocaleString()} watching
          </span>
        </>
      )}
    </motion.div>
  );
}
