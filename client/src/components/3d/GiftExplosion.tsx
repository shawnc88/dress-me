import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  scale: number;
  color: THREE.Color;
}

interface CoinProps {
  data: ParticleData;
  duration: number;
}

function Coin({ data, duration }: CoinProps) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(t / duration, 1);

    // Physics: velocity + gravity
    ref.current.position.x = data.position.x + data.velocity.x * t;
    ref.current.position.y = data.position.y + data.velocity.y * t - 2.5 * t * t;
    ref.current.position.z = data.position.z + data.velocity.z * t;

    // Spin
    ref.current.rotation.x += data.rotationSpeed.x * delta;
    ref.current.rotation.y += data.rotationSpeed.y * delta;

    // Fade + scale
    const fade = progress > 0.6 ? (1 - progress) / 0.4 : 1;
    (ref.current.material as THREE.MeshStandardMaterial).opacity = fade;
    ref.current.scale.setScalar(data.scale * (1 - progress * 0.3));
  });

  return (
    <mesh ref={ref} position={data.position.clone()}>
      <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
      <meshStandardMaterial color={data.color} transparent metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

interface GiftExplosionProps {
  /** Center point of the explosion in 3D space */
  origin?: [number, number, number];
  /** Number of coins in the burst */
  count?: number;
  /** How long the animation plays in seconds */
  duration?: number;
  /** 'gold' for high-value, 'silver' for mid, 'bronze' for low */
  tier?: 'gold' | 'silver' | 'bronze';
}

const TIER_COLORS: Record<string, string[]> = {
  gold: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d'],
  silver: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#64748b'],
  bronze: ['#d97706', '#b45309', '#92400e', '#f59e0b'],
};

export function GiftExplosion({ origin = [0, 0, 0], count = 24, duration = 2.5, tier = 'gold' }: GiftExplosionProps) {
  const particles = useMemo(() => {
    const colors = TIER_COLORS[tier];
    return Array.from({ length: count }, (): ParticleData => {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const force = 2 + Math.random() * 3;
      return {
        position: new THREE.Vector3(...origin),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * force,
          Math.sin(elevation) * force + 2,
          Math.sin(angle) * Math.cos(elevation) * force * 0.3,
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          0,
        ),
        scale: 0.6 + Math.random() * 0.8,
        color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)]),
      };
    });
  }, [origin, count, tier]);

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 3, 2]} intensity={1.5} color="#fbbf24" />
      {particles.map((data, i) => (
        <Coin key={i} data={data} duration={duration} />
      ))}
    </group>
  );
}
