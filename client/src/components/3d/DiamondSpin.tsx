import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Procedural diamond geometry — octahedron with custom vertex displacement */
function createDiamondGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  // Elongate the top half for a diamond look
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      pos.setY(i, y * 1.6);
    } else {
      pos.setY(i, y * 0.7);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface DiamondSpinProps {
  color?: string;
  emissive?: string;
  scale?: number;
  spinSpeed?: number;
}

export function DiamondSpin({
  color = '#67e8f9',
  emissive = '#06b6d4',
  scale = 1,
  spinSpeed = 1.5,
}: DiamondSpinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createDiamondGeometry(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y += delta * spinSpeed;
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    meshRef.current.rotation.z = Math.cos(t * 0.3) * 0.1;
    // Gentle float + breathing pulse
    meshRef.current.position.y = Math.sin(t * 2) * 0.3;
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    meshRef.current.scale.setScalar(scale * pulse);
  });

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={2} color="#67e8f9" />
      <pointLight position={[-2, -1, 2]} intensity={0.8} color="#a78bfa" />
      <mesh ref={meshRef} geometry={geometry} scale={scale}>
        <meshPhysicalMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.3}
          metalness={0.1}
          roughness={0.05}
          transmission={0.6}
          thickness={1.5}
          ior={2.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Sparkle ring around diamond */}
      <SparkleRing />
    </group>
  );
}

function SparkleRing() {
  const count = 8;
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / count) * Math.PI * 2 + t * 0.5;
      const radius = 1.8;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = Math.sin(t * 3 + i) * 0.3;
      const sparkle = 0.5 + Math.sin(t * 5 + i * 1.5) * 0.5;
      mesh.scale.setScalar(0.04 + sparkle * 0.06);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + sparkle * 0.7;
    });
  });

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#e0f2fe" transparent />
        </mesh>
      ))}
    </>
  );
}
