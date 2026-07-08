import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';

/**
 * TiltCard — Couture Nightfall pointer-reactive 3D tilt (CSS 3D, NO WebGL).
 *
 * Wraps any children in a `perspective` container and applies a subtle
 * rotateX/rotateY + a moving specular sheen that follows the pointer.
 * This is the CHEAP 3D accent — safe to use on every tier card, creator
 * card and stat tile on a page simultaneously.
 *
 * PERF BUDGET (production, iOS WKWebView):
 *   - Zero WebGL, zero canvas. One composited transform layer + one
 *     absolutely-positioned gradient overlay (the glare).
 *   - All pointer work goes through framer-motion motion values + springs,
 *     so React NEVER re-renders on pointer move.
 *   - Touch path attaches NO touch/pointer handlers at all (scroll and taps
 *     are untouched) — it only runs one slow autonomous sway animation.
 *
 * FALLBACK MATRIX:
 *   - prefers-reduced-motion → plain static <div> wrapper (no transforms,
 *     no glare, no handlers).
 *   - disabled → same static wrapper.
 *   - coarse pointer (touch) → very gentle idle 3D sway, no pointer
 *     tracking, nothing blocks taps or scroll.
 *   - fine pointer (mouse/trackpad) → full pointer tilt + specular glare.
 */

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** 'subtle' (default) ≈ 3.5° max tilt for dense grids; 'full' ≈ 7° for hero cards. */
  intensity?: 'subtle' | 'full';
  /** Moving specular sheen that follows the pointer. Default true. */
  glare?: boolean;
  /** Render a plain static wrapper (same as reduced-motion path). */
  disabled?: boolean;
}

/* Tuning per intensity — calm and expensive, never bouncy. */
const TILT = {
  subtle: { maxDeg: 3.5, glareOpacity: 0.1, lift: 1.008 },
  full: { maxDeg: 7, glareOpacity: 0.16, lift: 1.015 },
} as const;

/** Calm spring — cinematic settle, no wobble. */
const SPRING = { stiffness: 140, damping: 18, mass: 0.6 };

/**
 * SSR-safe "can hover with a fine pointer" probe. Defaults to false so the
 * server + first client paint match (this is a phone-first Capacitor app —
 * touch is the common case).
 */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setFine(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches);
    // Older WKWebView builds only expose addListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return fine;
}

function TiltCardInner({
  children,
  className,
  intensity = 'subtle',
  glare = true,
  disabled = false,
}: TiltCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const config = TILT[intensity];
  const ref = useRef<HTMLDivElement>(null);

  /* Raw pointer position, normalized to [-0.5, 0.5] from card center. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  /* Glare position as a percentage across the card. */
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareStrength = useMotionValue(0);

  /* Springs so the card glides, never snaps. React never re-renders here. */
  const rotateX = useSpring(py, SPRING); // vertical pointer → X-axis tilt
  const rotateY = useSpring(px, SPRING); // horizontal pointer → Y-axis tilt
  const glareXs = useSpring(glareX, SPRING);
  const glareYs = useSpring(glareY, SPRING);
  const glareOs = useSpring(glareStrength, { stiffness: 120, damping: 22 });

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareXs}% ${glareYs}%, rgba(255, 255, 255, ${glareOs}) 0%, rgba(243, 182, 160, 0.06) 32%, transparent 62%)`;

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // [-0.5, 0.5]
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      // Tilt TOWARD the pointer: pointer at top edge tips the top away → +rotateX.
      py.set(-ny * config.maxDeg * 2);
      px.set(nx * config.maxDeg * 2);
      glareX.set((nx + 0.5) * 100);
      glareY.set((ny + 0.5) * 100);
      glareStrength.set(config.glareOpacity);
    },
    [config.maxDeg, config.glareOpacity, px, py, glareX, glareY, glareStrength]
  );

  const handlePointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
    glareStrength.set(0);
    glareX.set(50);
    glareY.set(50);
  }, [px, py, glareStrength, glareX, glareY]);

  /* ---------------------------------------------------------------- */
  /* Static path: reduced motion or explicitly disabled.               */
  /* ---------------------------------------------------------------- */
  if (prefersReducedMotion || disabled) {
    return <div className={className}>{children}</div>;
  }

  /* ---------------------------------------------------------------- */
  /* Touch path (all iOS users): render static. A perpetual per-card 3D  */
  /* sway meant a grid of N cards ran N infinite JS animations that      */
  /* saturated the frame budget and made tab/scroll transitions janky.   */
  /* ---------------------------------------------------------------- */
  if (!finePointer) {
    return <div className={className}>{children}</div>;
  }

  /* ---------------------------------------------------------------- */
  /* Fine-pointer path: full pointer tilt + moving specular sheen.     */
  /* ---------------------------------------------------------------- */
  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 900 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        whileHover={{ scale: TILT[intensity].lift }}
        transition={{ type: 'spring', ...SPRING }}
        className="relative"
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{
              background: glareBackground,
              // Sit just above the card face in 3D so the sheen reads as
              // surface gloss, not a flat overlay.
              transform: 'translateZ(1px)',
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

export const TiltCard = memo(TiltCardInner);
export default TiltCard;
