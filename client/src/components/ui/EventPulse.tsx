'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

// Wraps anything in a pulse-on-event animation. Pass a `trigger` value
// (a counter, timestamp, last-message-id, whatever) — the wrapper emits
// a quick outward ring + subtle scale every time `trigger` changes.
//
// Use cases: new chat message arrived → chat panel pulses; new viewer
// joined → viewer-count pill pulses; raffle ticket sold → raffle widget
// pulses. Adds a kinetic "things are happening" signal to UI that would
// otherwise feel static between gifts.

interface EventPulseProps {
  /** Any value — when it changes (reference / equality), the pulse fires. */
  trigger: unknown;
  /** Tint of the outward ring. Default warm amber. */
  color?: string;
  /** Ring spread in pixels (0 → spread → 0). */
  spread?: number;
  /** Duration in seconds. */
  duration?: number;
  children: ReactNode;
  className?: string;
}

export function EventPulse({
  trigger,
  color = '#fbbf24',
  spread = 8,
  duration = 0.75,
  children,
  className = '',
}: EventPulseProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    // Fire-and-forget; framer queues if a previous animation is still running.
    void controls.start({
      boxShadow: [
        `0 0 0 0 ${color}00`,
        `0 0 0 ${spread}px ${color}80`,
        `0 0 0 0 ${color}00`,
      ],
      scale: [1, 1.015, 1],
      transition: { duration, ease: 'easeOut' },
    });
  }, [trigger, color, spread, duration, controls]);

  return (
    <motion.div animate={controls} className={className} style={{ borderRadius: 'inherit' }}>
      {children}
    </motion.div>
  );
}
