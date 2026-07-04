import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, Float } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useReducedMotion } from 'framer-motion';

/**
 * FloatingGem — Couture Nightfall hero 3D accent (lazy WebGL, r3f).
 *
 * A slowly rotating faceted gem, self-lit/emissive in the couture palette
 * (rose-gold / pink / violet) with ONE subtle bloom pass. For hero moments,
 * empty states and section headers — NOT for dense lists (use TiltCard there).
 *
 * Remember the bible: ONE 3D scene mounted per view. If a surface already
 * mounts AuroraBackdrop's 3D path, prefer `next/dynamic` + only one of the
 * two, or accept the gem as the single scene:
 *
 *   const FloatingGem = dynamic(
 *     () => import('@/components/3d/couture').then((m) => m.FloatingGem),
 *     { ssr: false }
 *   );
 *
 * PERF BUDGET (production, iOS WKWebView):
 *   - ONE mesh (icosahedron, 20 faces, flat-shaded) + 2 lights
 *     + ONE bloom pass (mipmapBlur, multisampling 0). No HDRIs, no textures,
 *     no shadows, no Environment — fully self-lit so nothing is fetched.
 *   - DPR capped [1, 1.5] with AdaptiveDpr degrading under load.
 *   - Per-frame work = two float additions on rotation. Nothing allocates.
 *
 * FALLBACK MATRIX:
 *   - SSR / pre-mount → pure-CSS glowing orb (zero flash, no layout shift).
 *   - No WebGL context → CSS glowing orb with `animate-float` drift.
 *   - prefers-reduced-motion → STATIC CSS orb (no float, no rotation).
 *   - Always `pointer-events-none` + `aria-hidden` — pure decoration.
 */

export interface FloatingGemProps {
  /** Square footprint in px (width = height). Default 160. */
  size?: number;
  /** Couture accent: 'gold' rose-gold (default, premium), 'pink' energy, 'violet' depth. */
  tone?: 'gold' | 'pink' | 'violet';
  className?: string;
  /** 'subtle' dials emissive + bloom down for busy screens; 'full' is the hero look. */
  intensity?: 'subtle' | 'full';
}

/* Couture Nightfall palette — tokens from the bible, never invented. */
const TONES = {
  gold: { base: '#F3B6A0', hot: '#f8d0b8' }, // rose-gold / gold-100-ish highlight
  pink: { base: '#FF4FA3', hot: '#ff83c0' }, // brand-500 energy
  violet: { base: '#7C5CFF', hot: '#a18aff' }, // violet-deep
} as const;

/** True once client-side AND a WebGL context can actually be created. */
function useWebGLReady(): { mounted: boolean; webglOk: boolean } {
  const [state, setState] = useState({ mounted: false, webglOk: false });
  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement('canvas');
      ok = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      ok = false;
    }
    setState({ mounted: true, webglOk: ok });
  }, []);
  return state;
}

/* ------------------------------------------------------------------ */
/* 3D path — one faceted, emissive gem inside a gentle drei Float      */
/* ------------------------------------------------------------------ */

function Gem({
  tone,
  intensity,
}: {
  tone: 'gold' | 'pink' | 'violet';
  intensity: 'subtle' | 'full';
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colors = TONES[tone];

  // Slow, expensive-feeling rotation — the only per-frame work in the scene.
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.y += delta * 0.35;
    mesh.rotation.x += delta * 0.11;
  });

  return (
    <Float
      speed={1.4}
      rotationIntensity={0.25}
      floatIntensity={0.7}
      floatingRange={[-0.08, 0.08]}
    >
      <mesh ref={meshRef}>
        {/* detail 0 = 20 flat faces — the "faceted" read comes free. */}
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={colors.base}
          emissive={colors.base}
          emissiveIntensity={intensity === 'full' ? 0.55 : 0.32}
          metalness={0.55}
          roughness={0.25}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function Gem3D({
  tone,
  intensity,
}: {
  tone: 'gold' | 'pink' | 'violet';
  intensity: 'subtle' | 'full';
}) {
  const hot = TONES[tone].hot;
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="always"
      camera={{ position: [0, 0, 3.2], fov: 45 }}
      gl={{
        alpha: true, // transparent — sits on whatever couture surface hosts it
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
    >
      <AdaptiveDpr pixelated />
      {/* Self-lit: soft fill + one warm key. No Environment/HDRI loads. */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color={hot} />
      <Gem tone={tone} intensity={intensity} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={intensity === 'full' ? 0.9 : 0.45}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/* CSS path — glowing orb (radial gradient + blur halo)                */
/* ------------------------------------------------------------------ */

function OrbCSS({
  tone,
  intensity,
  animate,
}: {
  tone: 'gold' | 'pink' | 'violet';
  intensity: 'subtle' | 'full';
  /** false when reduced-motion — fully static. */
  animate: boolean;
}) {
  const colors = TONES[tone];
  const glowOpacity = intensity === 'full' ? 0.55 : 0.35;

  const halo: CSSProperties = {
    position: 'absolute',
    inset: '8%',
    borderRadius: '9999px',
    background: `radial-gradient(circle at 50% 50%, ${colors.base} 0%, transparent 70%)`,
    filter: 'blur(18px)',
    opacity: glowOpacity,
  };
  const core: CSSProperties = {
    position: 'absolute',
    inset: '22%',
    borderRadius: '9999px',
    // Top-left highlight → tone → deep ink edge reads as a lit sphere.
    background: `radial-gradient(circle at 34% 28%, ${colors.hot} 0%, ${colors.base} 42%, #0a0a0c 100%)`,
    boxShadow: `0 0 24px 2px ${colors.base}55`,
  };

  return (
    <div className={animate ? 'absolute inset-0 animate-float' : 'absolute inset-0'}>
      <div style={halo} />
      <div style={core} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

function FloatingGemInner({
  size = 160,
  tone = 'gold',
  className,
  intensity = 'subtle',
}: FloatingGemProps) {
  const prefersReducedMotion = useReducedMotion();
  const { mounted, webglOk } = useWebGLReady();

  // WebGL only when: client-mounted, context available, motion allowed.
  const use3d = mounted && webglOk && !prefersReducedMotion;

  return (
    <div
      aria-hidden="true"
      className={`relative pointer-events-none select-none${
        className ? ` ${className}` : ''
      }`}
      style={{ width: size, height: size }}
    >
      {use3d ? (
        <Gem3D tone={tone} intensity={intensity} />
      ) : (
        <OrbCSS
          tone={tone}
          intensity={intensity}
          animate={mounted && !prefersReducedMotion}
        />
      )}
    </div>
  );
}

export const FloatingGem = memo(FloatingGemInner);
export default FloatingGem;
