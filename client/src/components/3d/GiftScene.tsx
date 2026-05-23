import { Suspense, lazy, memo, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
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
      return <FloatingHearts count={tier === 'gold' ? 32 : tier === 'silver' ? 22 : 14} tier={tier as 'gold' | 'silver' | 'bronze'} />;
    case 'explosion':
      return (
        <GiftExplosion
          count={tier === 'gold' ? 80 : tier === 'silver' ? 50 : 28}
          tier={tier as 'gold' | 'silver' | 'bronze'}
        />
      );
    case 'diamond':
      return <DiamondSpin scale={1.4} spinSpeed={2} />;
    default:
      return null;
  }
}

/** 3-point lighting that flatters reflective materials with bloom. Replaces
 *  the previous single-point lighting that left objects flat-shaded. */
function StageLights() {
  return (
    <>
      {/* Ambient — minimal, just enough to keep shadow side from going black */}
      <ambientLight intensity={0.25} />
      {/* Key light — primary directional from upper-right */}
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#fff8e7" />
      {/* Fill — softer, opposite side, slightly cooler */}
      <directionalLight position={[-4, 2, 3]} intensity={0.55} color="#cfe1ff" />
      {/* Rim — behind subject, gives an outline that bloom catches */}
      <directionalLight position={[0, -2, -5]} intensity={1.1} color="#ffd4f5" />
    </>
  );
}

/** Tier-aware post-processing. Gold gets the strongest bloom; bronze keeps
 *  it subtle so cheap tips don't dominate the stream view. */
function PostFx({ tier }: { tier: 'gold' | 'silver' | 'bronze' }) {
  const config = useMemo(() => {
    switch (tier) {
      case 'gold':
        return { intensity: 2.4, threshold: 0.2, smoothing: 0.7, vignette: 0.55 };
      case 'silver':
        return { intensity: 1.6, threshold: 0.35, smoothing: 0.6, vignette: 0.4 };
      case 'bronze':
      default:
        return { intensity: 1.0, threshold: 0.55, smoothing: 0.5, vignette: 0.25 };
    }
  }, [tier]);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={config.intensity}
        luminanceThreshold={config.threshold}
        luminanceSmoothing={config.smoothing}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette
        offset={0.3}
        darkness={config.vignette}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

interface GiftSceneProps {
  animations: ActiveAnimation[];
}

/**
 * R3F Canvas that renders gift animations over the stream view.
 * - pointer-events: none so it never blocks UI
 * - dpr capped at 1.5 for mobile perf
 * - frameloop="always" while animating, scene unmounts when idle (cap GPU drain)
 * - 3-point lighting + tier-aware bloom + ACES tonemap + vignette for the
 *   cinematic "premium gift" feel reviewers and fans actually notice.
 */
function GiftSceneInner({ animations }: GiftSceneProps) {
  if (animations.length === 0) return null;

  // Drive post-fx from the strongest active tier — when a gold gift is on
  // screen, every concurrent bronze tip rides the same boosted bloom.
  const topTier = animations.some((a) => a.tier === 'gold')
    ? 'gold'
    : animations.some((a) => a.tier === 'silver')
      ? 'silver'
      : 'bronze';

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
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        style={{ background: 'transparent' }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <StageLights />
        <Suspense fallback={null}>
          {animations.map((anim) => (
            <AnimationRenderer key={anim.id} type={anim.type!} tier={anim.tier} />
          ))}
        </Suspense>
        <PostFx tier={topTier} />
      </Canvas>
    </div>
  );
}

export const GiftScene = memo(GiftSceneInner);
