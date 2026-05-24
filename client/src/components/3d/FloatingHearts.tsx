import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';

/** Real 3D heart geometry. The previous version used ShapeGeometry which is
 *  flat — that's why hearts looked like stickers, not objects. ExtrudeGeometry
 *  gives the heart actual depth + chamfered bevel so lighting + bloom catch
 *  the curvature. */
function createHeartGeometry(size: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const s = size;
  shape.moveTo(0, s * 0.3);
  shape.bezierCurveTo(0, s * 0.6, -s * 0.5, s * 0.8, -s * 0.5, s * 0.5);
  shape.bezierCurveTo(-s * 0.5, s * 0.1, 0, 0, 0, -s * 0.3);
  shape.bezierCurveTo(0, 0, s * 0.5, s * 0.1, s * 0.5, s * 0.5);
  shape.bezierCurveTo(s * 0.5, s * 0.8, 0, s * 0.6, 0, s * 0.3);

  return new THREE.ExtrudeGeometry(shape, {
    depth: s * 0.35,
    bevelEnabled: true,
    bevelThickness: s * 0.06,
    bevelSize: s * 0.05,
    bevelSegments: 3,
    curveSegments: 12,
  });
}

interface HeartProps {
  startPosition: [number, number, number];
  speed: number;
  wobble: number;
  scale: number;
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  delay: number;
  trail: boolean;
}

function Heart({
  startPosition,
  speed,
  wobble,
  scale,
  color,
  emissiveColor,
  emissiveIntensity,
  delay,
  trail,
}: HeartProps) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createHeartGeometry(0.32), []);
  const elapsed = useRef(-delay);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsed.current += delta;
    if (elapsed.current < 0) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const t = elapsed.current;
    // Travel: rise + horizontal wobble + slight depth drift
    ref.current.position.y = startPosition[1] + t * speed;
    ref.current.position.x = startPosition[0] + Math.sin(t * wobble) * 0.7;
    ref.current.position.z = startPosition[2] + Math.cos(t * wobble * 0.5) * 0.25;
    // Tumble rotation — the bevel + emissive read very different per angle
    ref.current.rotation.z = Math.sin(t * 2) * 0.4;
    ref.current.rotation.y = t * 1.5;
    ref.current.rotation.x = Math.cos(t * 1.2) * 0.2;
    // Fade in/out + scale breathing
    const progress = Math.min(t / 3.2, 1);
    const fade =
      progress < 0.1 ? progress / 0.1 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fade;
    mat.emissiveIntensity = emissiveIntensity * fade;
    ref.current.scale.setScalar(scale * (0.85 + Math.sin(t * 3) * 0.15));
  });

  const heartMesh = (
    <mesh ref={ref} geometry={geometry} position={startPosition} visible={false}>
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.35}
        roughness={0.25}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );

  // Trails only for premium tiers — they're GPU-heavy at scale and just add
  // noise on bronze where there are many small hearts at once.
  return trail ? (
    <Trail
      width={0.6}
      length={4}
      color={new THREE.Color(emissiveColor)}
      attenuation={(w) => w * w}
    >
      {heartMesh}
    </Trail>
  ) : (
    heartMesh
  );
}

/** Tier-scaled palettes — gold hearts read warm + bright, silver/cool, bronze
 *  is the original pinks. Emissive does the heavy lifting against the bloom
 *  pass in GiftScene. */
const TIER_PALETTE: Record<string, { color: string[]; emissive: string[]; intensity: number; trail: boolean }> = {
  gold: {
    color: ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#fb7185'],
    emissive: ['#fbbf24', '#f59e0b', '#ef4444', '#fb7185'],
    intensity: 1.6,
    trail: true,
  },
  silver: {
    color: ['#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899'],
    emissive: ['#ec4899', '#f43f5e', '#fb7185'],
    intensity: 1.1,
    trail: true,
  },
  bronze: {
    color: ['#ef4444', '#f43f5e', '#ec4899', '#fb7185'],
    emissive: ['#ef4444', '#f43f5e', '#ec4899'],
    intensity: 0.55,
    trail: false,
  },
};

interface FloatingHeartsProps {
  count?: number;
  tier?: 'gold' | 'silver' | 'bronze';
}

export function FloatingHearts({ count = 14, tier = 'bronze' }: FloatingHeartsProps) {
  const palette = TIER_PALETTE[tier];
  const hearts = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      startPosition: [
        (Math.random() - 0.5) * 4.5,
        -3 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.8,
      ] as [number, number, number],
      speed: 0.9 + Math.random() * 0.7,
      wobble: 2 + Math.random() * 2.2,
      scale: tier === 'gold' ? 0.7 + Math.random() * 0.9 : 0.5 + Math.random() * 0.7,
      color: palette.color[Math.floor(Math.random() * palette.color.length)],
      emissiveColor: palette.emissive[Math.floor(Math.random() * palette.emissive.length)],
      emissiveIntensity: palette.intensity,
      delay: Math.random() * 1.4,
      trail: palette.trail,
    }));
  }, [count, palette]);

  return (
    <group>
      {hearts.map((props) => (
        <Heart {...props} />
      ))}
    </group>
  );
}
