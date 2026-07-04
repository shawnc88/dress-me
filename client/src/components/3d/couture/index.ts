/**
 * Couture Nightfall — shared 3D accent kit.
 *
 * - TiltCard          CSS-3D pointer tilt + specular sheen (cheap, use everywhere)
 * - FloatingGem       lazy WebGL faceted gem accent (hero moments / empty states)
 * - AtmosphereSection AuroraBackdrop + grain section wrapper (instant ambient)
 *
 * All components are SSR-safe, honor prefers-reduced-motion, degrade without
 * WebGL, and keep decorative layers pointer-events-none. See each file's
 * PERF BUDGET / FALLBACK MATRIX before mounting on a new surface, and the
 * bible: docs/COUTURE_NIGHTFALL.md (one 3D scene per view, never behind
 * full-screen live video).
 *
 * Heavy import note: FloatingGem pulls the three.js bundle (~265kB). When a
 * route doesn't always show it, load via
 *   next/dynamic(() => import('@/components/3d/couture').then(m => m.FloatingGem), { ssr: false })
 * TiltCard and AtmosphereSection are safe to import statically.
 */

export { TiltCard, type TiltCardProps } from './TiltCard';
export { FloatingGem, type FloatingGemProps } from './FloatingGem';
export {
  AtmosphereSection,
  type AtmosphereSectionProps,
} from './AtmosphereSection';
