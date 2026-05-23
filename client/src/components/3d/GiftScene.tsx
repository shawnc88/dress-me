import { Suspense, lazy, memo, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { ActiveAnimation } from './useGiftAnimation';
import { CameraDirector } from './CameraDirector';
import { StageBackdrop } from './StageBackdrop';
import { GiftHud, type SenderInfo, type ComboInfo } from './GiftHud';

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

/** Combo amplifies the renderer — more particles, brighter emissive. Capped
 *  so a 50× combo doesn't melt a mid-range Android. */
function comboAmplifier(count: number): number {
  return Math.min(1 + (count - 1) * 0.12, 2.4);
}

function AnimationRenderer({ anim }: { anim: ActiveAnimation }) {
  const amp = comboAmplifier(anim.comboCount);
  const baseHearts = anim.tier === 'gold' ? 32 : anim.tier === 'silver' ? 22 : 14;
  const baseExplosion = anim.tier === 'gold' ? 80 : anim.tier === 'silver' ? 50 : 28;
  switch (anim.type) {
    case 'hearts':
      return (
        <FloatingHearts
          count={Math.round(baseHearts * amp)}
          tier={anim.tier}
        />
      );
    case 'explosion':
      return (
        <GiftExplosion
          count={Math.round(baseExplosion * amp)}
          tier={anim.tier}
        />
      );
    case 'diamond':
      return <DiamondSpin scale={1.4 * Math.min(amp, 1.6)} spinSpeed={2} />;
    default:
      return null;
  }
}

/** 3-point lighting that flatters reflective materials with bloom. Replaces
 *  the previous single-point lighting that left objects flat-shaded. */
function StageLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#fff8e7" />
      <directionalLight position={[-4, 2, 3]} intensity={0.55} color="#cfe1ff" />
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
  /** Latest sender + combo for the HUD layer. Pass undefined / null when
   *  you don't want either overlay (e.g. system test triggers). */
  latestSender?: SenderInfo | null;
  latestCombo?: ComboInfo | null;
}

/**
 * Premium gift moment, end to end:
 *   - 3D scene (Canvas) renders the particles/hearts/diamond
 *   - 3-point lighting + bloom + ACES tonemap + vignette = cinematic look
 *   - CameraDirector orbits + pushes back on gold tier
 *   - StageBackdrop blurs the stream view behind the gold takeover
 *   - GiftHud shows the sender + combo counter outside the Canvas
 *
 * Layer ordering by z-index:
 *   stream view  (whatever's behind)
 *   z-40 StageBackdrop
 *   z-50 Canvas (3D)
 *   z-60 GiftHud (sender + combo)
 */
function GiftSceneInner({ animations, latestSender, latestCombo }: GiftSceneProps) {
  // Always render the layers — StageBackdrop CSS-transitions based on
  // `active`, so we can let it persist quietly when nothing is going on.
  const goldActive = animations.some((a) => a.tier === 'gold');
  const topTier: 'gold' | 'silver' | 'bronze' = goldActive
    ? 'gold'
    : animations.some((a) => a.tier === 'silver')
      ? 'silver'
      : 'bronze';

  const showCanvas = animations.length > 0;

  return (
    <>
      <StageBackdrop active={goldActive} />
      <GiftHud sender={latestSender ?? null} combo={latestCombo ?? null} />
      {showCanvas && (
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
            <CameraDirector active={goldActive} />
            <StageLights />
            <Suspense fallback={null}>
              {animations.map((anim) => (
                <AnimationRenderer key={anim.id} anim={anim} />
              ))}
            </Suspense>
            <PostFx tier={topTier} />
          </Canvas>
        </div>
      )}
    </>
  );
}

export const GiftScene = memo(GiftSceneInner);
