import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Cinematic camera for premium-tier gifts. When a gold gift is on screen,
// the camera slowly orbits + pushes back so the moment reads as theatrical
// instead of "gift floats in front of the viewer." When no gold is active
// the camera springs back toward its base position.
//
// Lives inside the Canvas (it uses useThree + useFrame) — kept separate
// from GiftScene so the choreography logic is one focused file.

const BASE = { x: 0, y: 0, z: 6 };

interface CameraDirectorProps {
  active: boolean;
}

export function CameraDirector({ active }: CameraDirectorProps) {
  const { camera } = useThree();
  const elapsed = useRef(0);

  // Reset the clock every time the active flag flips on — so the orbit
  // starts from t=0 each takeover, not from wherever the last one ended.
  useEffect(() => {
    if (active) elapsed.current = 0;
  }, [active]);

  useFrame((_, delta) => {
    if (active) {
      elapsed.current += delta;
      const t = elapsed.current;
      const orbit = t * 0.45; // slow rotation — premium pacing
      const pushback = Math.min(t / 0.8, 1) * 1.8; // 0.8s push back, then hold
      camera.position.x = Math.sin(orbit) * 1.4;
      camera.position.y = Math.sin(orbit * 0.6) * 0.45;
      camera.position.z = BASE.z + pushback + Math.sin(orbit * 0.4) * 0.4;
    } else {
      // Smoothly return — lerp toward base, not instant snap
      camera.position.x += (BASE.x - camera.position.x) * 0.08;
      camera.position.y += (BASE.y - camera.position.y) * 0.08;
      camera.position.z += (BASE.z - camera.position.z) * 0.08;
    }
    camera.lookAt(0, 0, 0);
  });

  return null;
}
