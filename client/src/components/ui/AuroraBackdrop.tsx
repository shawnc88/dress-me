import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

/**
 * AuroraBackdrop — the "Couture Nightfall" signature atmosphere.
 *
 * Full-bleed animated backdrop that sits BEHIND content (absolute inset-0,
 * -z-10, pointer-events-none). Two render paths behind one API:
 *
 *   1. 3D  — a single full-screen plane with a custom emissive fragment
 *            shader (slow silk/aurora ribbons in pink→violet→rose-gold over
 *            deep ink) plus one subtle Bloom pass.
 *   2. CSS — the `.nightfall-canvas` gradient + two blurred drifting blobs
 *            (pure CSS keyframes). Used for reduced-motion, `variant="css"`,
 *            missing WebGL, and always as the SSR-safe underpaint so there
 *            is zero flash / layout shift before the Canvas mounts.
 *
 * PERF BUDGET (production, iOS WKWebView):
 *   - Exactly ONE draw call (one 2×2 clip-space plane, no lights, no depth)
 *     + ONE bloom pass (mipmapBlur, multisampling 0).
 *   - DPR capped at [1, 1.5] with AdaptiveDpr degrading under load.
 *   - Shader is GLSL ES 1.0-safe: 3 unrolled ribbon evaluations, sin/exp
 *     only — no loops, no derivatives, no textures.
 */

export interface AuroraBackdropProps {
  /**
   * 'auto' (default) — 3D unless the user prefers reduced motion or WebGL
   * is unavailable. '3d' — force the WebGL path (still falls back if WebGL
   * itself is missing). 'css' — force the pure-CSS path.
   */
  variant?: 'auto' | '3d' | 'css';
  /** 'subtle' dials everything down for busy screens; 'full' is the hero look. */
  intensity?: 'subtle' | 'full';
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Palette (Couture Nightfall)                                         */
/* ------------------------------------------------------------------ */

const INK_DEEP = '#050506';
const INK_SOFT = '#0a0a0c';
const PINK = '#FF4FA3';
const VIOLET = '#7C5CFF';
const ROSE_GOLD = '#F3B6A0';

/* ------------------------------------------------------------------ */
/* Hooks: reduced-motion + client mount + WebGL availability           */
/* ------------------------------------------------------------------ */

/** SSR-safe prefers-reduced-motion with live updates. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Older WKWebView builds only expose addListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return reduced;
}

/** True once we're client-side AND a WebGL context can actually be created. */
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
/* 3D path — full-screen aurora shader plane                           */
/* ------------------------------------------------------------------ */

// Clip-space passthrough: the 2×2 plane covers the viewport regardless of
// camera, so the whole 3D path is camera-independent and exactly 1 draw call.
const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// GLSL ES 1.0-safe. Three soft "silk ribbons" — each a gaussian band whose
// center line undulates with two slow sine octaves. No loops, no textures.
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uAspect;

  // Couture Nightfall palette
  const vec3 INK       = vec3(0.020, 0.020, 0.024); // #050506
  const vec3 PINK      = vec3(1.000, 0.310, 0.639); // #FF4FA3
  const vec3 VIOLET    = vec3(0.486, 0.361, 1.000); // #7C5CFF
  const vec3 ROSE_GOLD = vec3(0.953, 0.714, 0.627); // #F3B6A0

  // One flowing ribbon: gaussian falloff around an undulating center line.
  float ribbon(vec2 p, float center, float t, float freq, float amp, float width) {
    float wave = sin(p.x * freq + t) * amp
               + sin(p.x * freq * 2.3 - t * 0.7) * amp * 0.35;
    float d = p.y - (center + wave);
    return exp(-d * d / (width * width));
  }

  void main() {
    // Aspect-corrected coords so ribbons don't stretch on tall phones.
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    float t = uTime * 0.12; // slow, expensive-feeling drift

    float rPink   = ribbon(p, 0.68, t,         2.1, 0.075, 0.16);
    float rViolet = ribbon(p, 0.42, t * 0.8 + 2.1, 1.6, 0.095, 0.22);
    float rGold   = ribbon(p, 0.16, t * 0.6 + 4.2, 2.6, 0.055, 0.12);

    // Deep-ink vertical wash (echoes .nightfall-canvas).
    vec3 col = mix(vec3(0.039, 0.039, 0.047), INK, vUv.y);

    // Additive silk — screen-ish blend keeps blacks rich, highlights bloomable.
    col += PINK      * rPink   * 0.42 * uIntensity;
    col += VIOLET    * rViolet * 0.38 * uIntensity;
    col += ROSE_GOLD * rGold   * 0.26 * uIntensity;

    // Faint violet corner glow for depth.
    float glow = exp(-length(p - vec2(uAspect * 0.85, 0.95)) * 1.8);
    col += VIOLET * glow * 0.10 * uIntensity;

    // Cheap ordered-noise dither to kill gradient banding on OLED.
    float dither = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    col += (dither - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function AuroraPlane({ intensity }: { intensity: 'subtle' | 'full' }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: intensity === 'full' ? 1.0 : 0.55 },
          uAspect: { value: 1 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    // Material is created once; intensity updates flow through the uniform below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uIntensity.value = intensity === 'full' ? 1.0 : 0.55;
  }, [intensity, material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAspect.value =
      state.size.width / Math.max(state.size.height, 1);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" ref={materialRef} />
    </mesh>
  );
}

function Aurora3D({ intensity }: { intensity: 'subtle' | 'full' }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <AdaptiveDpr pixelated />
      <AuroraPlane intensity={intensity} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={intensity === 'full' ? 0.65 : 0.35}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.75}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/* CSS path — nightfall gradient + drifting couture blobs              */
/* ------------------------------------------------------------------ */

const CSS_KEYFRAMES = `
@keyframes aurora-drift-a {
  0%   { transform: translate3d(-6%, -4%, 0) scale(1); }
  50%  { transform: translate3d(7%, 6%, 0) scale(1.12); }
  100% { transform: translate3d(-6%, -4%, 0) scale(1); }
}
@keyframes aurora-drift-b {
  0%   { transform: translate3d(5%, 6%, 0) scale(1.08); }
  50%  { transform: translate3d(-7%, -5%, 0) scale(0.96); }
  100% { transform: translate3d(5%, 6%, 0) scale(1.08); }
}
@keyframes aurora-drift-c {
  0%   { transform: translate3d(0%, 4%, 0) scale(1); }
  50%  { transform: translate3d(-4%, -6%, 0) scale(1.1); }
  100% { transform: translate3d(0%, 4%, 0) scale(1); }
}
`;

function blobStyle(
  color: string,
  pos: CSSProperties,
  size: string,
  opacity: number,
  animation: string | undefined
): CSSProperties {
  return {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '9999px',
    background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
    filter: 'blur(64px)',
    opacity,
    animation,
    willChange: animation ? 'transform' : undefined,
    ...pos,
  };
}

function AuroraCSS({
  intensity,
  animate,
}: {
  intensity: 'subtle' | 'full';
  /** false when the user prefers reduced motion — near-static gradients. */
  animate: boolean;
}) {
  const opacityScale = intensity === 'full' ? 1 : 0.6;
  return (
    <>
      {animate && <style>{CSS_KEYFRAMES}</style>}
      <div
        style={blobStyle(
          `${PINK}59`, // ~35% alpha
          { top: '-12%', left: '-14%' },
          '62vmax',
          0.5 * opacityScale,
          animate ? 'aurora-drift-a 26s ease-in-out infinite' : undefined
        )}
      />
      <div
        style={blobStyle(
          `${VIOLET}59`,
          { top: '4%', right: '-18%' },
          '58vmax',
          0.45 * opacityScale,
          animate ? 'aurora-drift-b 32s ease-in-out infinite' : undefined
        )}
      />
      <div
        style={blobStyle(
          `${ROSE_GOLD}40`, // ~25% alpha
          { bottom: '-20%', left: '18%' },
          '52vmax',
          0.35 * opacityScale,
          animate ? 'aurora-drift-c 38s ease-in-out infinite' : undefined
        )}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

function AuroraBackdropInner({
  variant = 'auto',
  intensity = 'full',
  className,
}: AuroraBackdropProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { mounted, webglOk } = useWebGLReady();

  // 3D only when: explicitly requested or auto without reduced-motion,
  // AND we're client-side with a working WebGL context.
  const wants3d =
    variant === '3d' || (variant === 'auto' && !prefersReducedMotion);
  const use3d = wants3d && mounted && webglOk && !prefersReducedMotion;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none nightfall-canvas${
        className ? ` ${className}` : ''
      }`}
      // Inline fallback so the deep-ink base paints even if the utility
      // class ever goes missing — guarantees zero white flash on SSR.
      style={{
        backgroundColor: INK_DEEP,
        backgroundImage: `linear-gradient(180deg, ${INK_SOFT} 0%, ${INK_DEEP} 100%)`,
      }}
    >
      {use3d ? (
        <Aurora3D intensity={intensity} />
      ) : (
        <AuroraCSS intensity={intensity} animate={!prefersReducedMotion} />
      )}
    </div>
  );
}

export const AuroraBackdrop = memo(AuroraBackdropInner);
export default AuroraBackdrop;
