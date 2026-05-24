import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';

// Upgraded burst: replaces flat 16-sided cylinders with faceted icosahedrons
// + emissive materials that catch GiftScene's bloom pass, optional Trail
// streaks behind each shard for premium tiers, and a central flash that
// expands + fades on spawn. The previous version looked like 1995 Three.js
// because every particle was a flat coin with a single-color matte material.

interface ShardData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  scale: number;
  color: THREE.Color;
  emissive: THREE.Color;
}

interface ShardProps {
  data: ShardData;
  duration: number;
  emissiveBoost: number;
  trail: boolean;
}

function Shard({ data, duration, emissiveBoost, trail }: ShardProps) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(t / duration, 1);

    // Ballistic motion with gravity. Slightly more drag-feel than before by
    // scaling velocity over time so shards "float" near apex instead of
    // a hard parabola.
    const drag = 1 - progress * 0.3;
    ref.current.position.x = data.position.x + data.velocity.x * t * drag;
    ref.current.position.y =
      data.position.y + data.velocity.y * t - 2.8 * t * t;
    ref.current.position.z = data.position.z + data.velocity.z * t * drag;

    // Tumble
    ref.current.rotation.x += data.rotationSpeed.x * delta;
    ref.current.rotation.y += data.rotationSpeed.y * delta;
    ref.current.rotation.z += data.rotationSpeed.z * delta;

    // Fade + shrink late
    const fade = progress > 0.55 ? (1 - progress) / 0.45 : 1;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fade;
    mat.emissiveIntensity = emissiveBoost * fade;
    ref.current.scale.setScalar(data.scale * (1 - progress * 0.35));
  });

  const shardMesh = (
    <mesh ref={ref} position={data.position.clone()}>
      {/* Icosahedron (detail=0) = 20-sided faceted shape. Catches lighting
          across many angles, sparkles vs a flat cylinder. */}
      <icosahedronGeometry args={[0.18, 0]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.emissive}
        emissiveIntensity={emissiveBoost}
        metalness={0.85}
        roughness={0.15}
        transparent
      />
    </mesh>
  );

  return trail ? (
    <Trail
      width={0.35}
      length={3}
      color={data.emissive}
      attenuation={(w) => w * w * w}
    >
      {shardMesh}
    </Trail>
  ) : (
    shardMesh
  );
}

/** Central flash that expands then fades — gives the burst a clear "moment
 *  of impact" focal point instead of just a particle blob spreading outward. */
function CentralFlash({
  origin,
  color,
  duration,
}: {
  origin: [number, number, number];
  color: THREE.Color;
  duration: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    // Flash lifetime is much shorter than the shards (0.6s of the 2.5s total)
    const flashLife = Math.min(duration * 0.25, 0.7);
    const progress = Math.min(t / flashLife, 1);
    const scale = 0.4 + progress * 3.5;
    ref.current.scale.setScalar(scale);
    const fade = 1 - progress;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = fade * 0.85;
    if (progress >= 1) ref.current.visible = false;
  });

  return (
    <mesh ref={ref} position={origin}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={color} transparent toneMapped={false} />
    </mesh>
  );
}

interface GiftExplosionProps {
  origin?: [number, number, number];
  count?: number;
  duration?: number;
  tier?: 'gold' | 'silver' | 'bronze';
}

const TIER_CONFIG = {
  gold: {
    colors: ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706'],
    emissives: ['#fbbf24', '#f59e0b', '#facc15'],
    flashColor: '#fde68a',
    emissiveBoost: 1.6,
    trail: true,
    force: { min: 2.5, max: 5 },
  },
  silver: {
    colors: ['#f1f5f9', '#cbd5e1', '#94a3b8', '#e2e8f0', '#a78bfa'],
    emissives: ['#cbd5e1', '#a78bfa', '#c4b5fd'],
    flashColor: '#e2e8f0',
    emissiveBoost: 1.0,
    trail: true,
    force: { min: 2, max: 4 },
  },
  bronze: {
    colors: ['#f59e0b', '#d97706', '#b45309', '#fbbf24'],
    emissives: ['#f59e0b', '#d97706'],
    flashColor: '#fbbf24',
    emissiveBoost: 0.55,
    trail: false,
    force: { min: 1.6, max: 3 },
  },
};

export function GiftExplosion({
  origin = [0, 0, 0],
  count = 28,
  duration = 2.6,
  tier = 'gold',
}: GiftExplosionProps) {
  const config = TIER_CONFIG[tier];
  const flashColor = useMemo(() => new THREE.Color(config.flashColor), [config.flashColor]);

  const shards = useMemo(() => {
    return Array.from({ length: count }, (): ShardData => {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.25) * Math.PI;
      const force = config.force.min + Math.random() * (config.force.max - config.force.min);
      return {
        position: new THREE.Vector3(...origin),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * force,
          Math.sin(elevation) * force + 2.4,
          Math.sin(angle) * Math.cos(elevation) * force * 0.35,
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
        ),
        scale: 0.7 + Math.random() * 1.0,
        color: new THREE.Color(config.colors[Math.floor(Math.random() * config.colors.length)]),
        emissive: new THREE.Color(config.emissives[Math.floor(Math.random() * config.emissives.length)]),
      };
    });
  }, [origin, count, config]);

  return (
    <group>
      <CentralFlash origin={origin} color={flashColor} duration={duration} />
      {shards.map((data, i) => (
        <Shard
          key={i}
          data={data}
          duration={duration}
          emissiveBoost={config.emissiveBoost}
          trail={config.trail}
        />
      ))}
    </group>
  );
}
