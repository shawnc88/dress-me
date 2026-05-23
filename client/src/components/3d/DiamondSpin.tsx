import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Procedural diamond geometry — octahedron elongated at the top half for the
 *  classic brilliant-cut silhouette. */
function createDiamondGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setY(i, y > 0 ? y * 1.6 : y * 0.7);
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

/**
 * Premium diamond gift — slow tumble + breathing pulse + orbiting sparkle ring.
 *
 * Sprint-1 cleanup: removed the component-local <ambientLight>/<pointLight>
 * pair. GiftScene now provides 3-point lighting + bloom for the whole
 * canvas, so any per-component lighting double-lit the scene and washed out
 * the bloom contrast. Material now leans harder on emissive (which the
 * bloom pass amplifies) — looks 2× brighter on iOS WebView without adding
 * any actual pixels.
 */
export function DiamondSpin({
  color = '#a5f3fc',
  emissive = '#06b6d4',
  scale = 1,
  spinSpeed = 1.5,
}: DiamondSpinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createDiamondGeometry(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y += delta * spinSpeed;
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    meshRef.current.rotation.z = Math.cos(t * 0.3) * 0.1;
    // Gentle vertical drift + breathing pulse
    meshRef.current.position.y = Math.sin(t * 2) * 0.25;
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    meshRef.current.scale.setScalar(scale * pulse);
    // Pulse emissive intensity too — bloom catches the rhythm
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.4 + Math.sin(t * 2) * 0.4;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} scale={scale}>
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.4}
          metalness={0.85}
          roughness={0.08}
          transparent
          opacity={0.95}
        />
      </mesh>
      <SparkleRing />
    </group>
  );
}

/** Orbital sparkles around the diamond. Each sparkle has independent rotation
 *  phase + breathing brightness, so they read as "shimmer" rather than a
 *  fixed ring. */
function SparkleRing() {
  const count = 12; // bumped from 8 — bloom catches the extra glints
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / count) * Math.PI * 2 + t * 0.5;
      const radius = 2.0;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = Math.sin(t * 3 + i) * 0.4;
      const sparkle = 0.5 + Math.sin(t * 5 + i * 1.5) * 0.5;
      mesh.scale.setScalar(0.05 + sparkle * 0.09);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + sparkle * 0.6;
    });
  });

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          {/* toneMapped=false keeps the sparkle pure white instead of being
              crushed by the ACES tonemap — they should look like pure
              specular hits, not a material. */}
          <meshBasicMaterial color="#ffffff" transparent toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
