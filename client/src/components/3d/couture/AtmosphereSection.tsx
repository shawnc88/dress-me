import { memo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the WebGL/three.js backdrop so consumers that statically import
// AtmosphereSection keep their children in SSR but do NOT pull three.js into
// first-load JS — it streams in only when the aurora actually mounts.
const AuroraBackdrop = dynamic(() => import('@/components/ui/AuroraBackdrop'), {
  ssr: false,
});

/**
 * AtmosphereSection — instant Couture Nightfall ambient for any page section.
 *
 * A `relative` container with `AuroraBackdrop` (subtle by default) layered
 * behind the children, plus optional `.grain` film texture. Surface builders
 * wrap a section and get the "3D everywhere" atmosphere with zero wiring:
 *
 *   <AtmosphereSection className="rounded-4xl p-6" grain>
 *     <h2 className="editorial ...">Your tiers</h2>
 *     ...
 *   </AtmosphereSection>
 *
 * PERF BUDGET:
 *   - This wrapper itself adds ZERO cost — all rendering is delegated to
 *     AuroraBackdrop (1 draw call + 1 bloom pass on its 3D path) and the
 *     `.grain` ::before overlay (pure CSS).
 *   - GUARDRAIL: one 3D scene per view. Do NOT nest AtmosphereSections or
 *     stack one on a route that already mounts AuroraBackdrop/FloatingGem's
 *     WebGL path — pass `backdrop="none"` (or let the outer one own it).
 *   - Never behind full-screen live video (feed/reels/stream/suite) — the
 *     video is the star there; use this on browse/profile/dashboard/empty
 *     states instead.
 *
 * FALLBACK MATRIX (all inherited from AuroraBackdrop):
 *   - SSR → deep-ink `.nightfall-canvas` underpaint, zero flash.
 *   - No WebGL → animated CSS aurora blobs.
 *   - prefers-reduced-motion → near-static CSS gradients.
 *   - Backdrop + grain are `pointer-events-none`; children stay interactive.
 */

export interface AtmosphereSectionProps {
  children: ReactNode;
  className?: string;
  /** Backdrop strength. Default 'subtle' — ambient, content stays the star. */
  intensity?: 'subtle' | 'full';
  /** Adds the `.grain` film-texture overlay (globals.css ::before). Default false. */
  grain?: boolean;
  /** 'aurora' (default) mounts AuroraBackdrop; 'none' = plain relative wrapper. */
  backdrop?: 'aurora' | 'none';
}

function AtmosphereSectionInner({
  children,
  className,
  intensity = 'subtle',
  grain = false,
  backdrop = 'aurora',
}: AtmosphereSectionProps) {
  // `.grain` paints via ::before on the container itself; `overflow-hidden`
  // keeps the backdrop's blurred blobs clipped to the section's radius.
  const classes = [
    'relative',
    'overflow-hidden',
    grain ? 'grain' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      {backdrop === 'aurora' && (
        // absolute inset-0 -z-10 pointer-events-none — content above, taps safe.
        <AuroraBackdrop intensity={intensity} />
      )}
      {children}
    </section>
  );
}

export const AtmosphereSection = memo(AtmosphereSectionInner);
export default AtmosphereSection;
