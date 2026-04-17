import { Suspense, lazy, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import type { ActiveAnimation } from './useGiftAnimation';

// Lazy-load heavy 3D components — only downloaded when first animation triggers
const FloatingHearts = lazy(() =>
  import('./FloatingHearts').then((m) => ({ default: m.FloatingHearts }))
);
const GiftExplosion = lazy(() =>
  import('./GiftExplosion').then((m) => ({ default: m.GiftExplosion }))
);
const DiamondSpin = lazy(() =>
  import('./DiamondSpin').then((m) => ({ default: m.DiamondSpin }))
);

function AnimationRenderer({ type, tier }: { type: string; tier: string }) {
  switch (type) {
    case 'hearts':
      return <FloatingHearts count={14} />;
    case 'explosion':
      return (
        <GiftExplosion
          count={tier === 'gold' ? 32 : tier === 'silver' ? 24 : 16}
          tier={tier as 'gold' | 'silver' | 'bronze'}
        />
      );
    case 'diamond':
      return <DiamondSpin scale={1.2} spinSpeed={2} />;
    default:
      return null;
  }
}

interface GiftSceneProps {
  animations: ActiveAnimation[];
}

/**
 * Lightweight R3F Canvas that renders gift animations.
 * - pointer-events: none so it never blocks UI
 * - dpr capped at 1.5 for mobile perf
 * - frameloop="demand" when idle, "always" when animating
 */
function GiftSceneInner({ animations }: GiftSceneProps) {
  if (animations.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none"
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'low-power',
          stencil: false,
          depth: true,
        }}
        style={{ background: 'transparent' }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Suspense fallback={null}>
          {animations.map((anim) => (
            <AnimationRenderer key={anim.id} type={anim.type!} tier={anim.tier} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

export const GiftScene = memo(GiftSceneInner);
