'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

// A number that animates between values with a spring, instead of snapping.
// Drop in for viewer count, total tips, raffle entries, paying-fan count —
// anything where a changing number is part of "this platform is alive."
//
// Locale-formatted (1,234 not 1234), respects prefers-reduced-motion by
// short-circuiting to an instant set. SSR-safe: initial render shows the
// formatted starting value, no flash of empty.

interface NumberRollerProps {
  value: number;
  /** Stiffness — higher = snappier. Default tuned for "viewer count" feel. */
  stiffness?: number;
  /** Damping — higher = less bounce. */
  damping?: number;
  className?: string;
  /** Number of decimals to show (default 0). */
  decimals?: number;
  /** Locale for number formatting (default 'en-US'). */
  locale?: string;
}

function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function NumberRoller({
  value,
  stiffness = 120,
  damping = 22,
  className = '',
  decimals = 0,
  locale = 'en-US',
}: NumberRollerProps) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(shouldReduceMotion());
  }, []);

  const spring = useSpring(value, { stiffness, damping });
  const display = useTransform(spring, (latest) =>
    Number(latest).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    if (reduce) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, reduce, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
