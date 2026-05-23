import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Subtle drifting "dust motes" / sparkles that render in the gift overlay
// even when no gift is active. Addresses the "platform looks dead between
// gifts" failure mode — the bloom pass picks up the floaters' soft glow so
// the stream view always has gentle motion + atmospheric light.
//
// Engineered cheap on purpose: 22 sphere primitives (6 segments — they're
// 25-80px on screen, no one will see the polygon count), no shadows, no
// physics, no PBR. Total cost on iOS WebView ~0.3ms/frame at 60fps.

interface Mote {
  position: THREE.Vector3;
  velocity: number;
  scale: number;
  phase: number;
}

const COUNT = 22;
const Y_TOP = 4;
const Y_BOTTOM = -4;

export function AmbientFloaters() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const motes = useMemo<Mote[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Y_BOTTOM + Math.random() * (Y_TOP - Y_BOTTOM),
          (Math.random() - 0.5) * 4,
        ),
        velocity: 0.08 + Math.random() * 0.14,
        scale: 0.022 + Math.random() * 0.045,
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mote = motes[i];
      // Vertical rise; recycle to bottom when they exit the top
      mote.position.y += mote.velocity * delta;
      if (mote.position.y > Y_TOP) {
        mote.position.y = Y_BOTTOM;
        mote.position.x = (Math.random() - 0.5) * 8;
        mote.position.z = (Math.random() - 0.5) * 4;
      }
      mesh.position.y = mote.position.y;
      mesh.position.x =
        mote.position.x + Math.sin(t * 0.4 + mote.phase) * 0.45;
      mesh.position.z = mote.position.z;
      // Slow twinkle on opacity — gives the layer life without any motion
      const sparkle = 0.5 + Math.sin(t * 1.3 + mote.phase * 3) * 0.5;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.18 + sparkle * 0.35;
    });
  });

  return (
    <group>
      {motes.map((mote, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={mote.position.clone()}
          scale={mote.scale}
        >
          <sphereGeometry args={[1, 6, 6]} />
          {/* toneMapped=false: stay pure white through ACES so the bloom
              pass catches them as light sources, not surface material.
              depthWrite=false: layer cleanly through anything in front. */}
          <meshBasicMaterial
            color="#fff8e7"
            transparent
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
