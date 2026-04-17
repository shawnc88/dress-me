import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Creates a flat heart-shaped geometry using a ShapeGeometry */
function createHeartShape(size: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const s = size;
  shape.moveTo(0, s * 0.3);
  shape.bezierCurveTo(0, s * 0.6, -s * 0.5, s * 0.8, -s * 0.5, s * 0.5);
  shape.bezierCurveTo(-s * 0.5, s * 0.1, 0, 0, 0, -s * 0.3);
  shape.bezierCurveTo(0, 0, s * 0.5, s * 0.1, s * 0.5, s * 0.5);
  shape.bezierCurveTo(s * 0.5, s * 0.8, 0, s * 0.6, 0, s * 0.3);
  return new THREE.ShapeGeometry(shape);
}

interface HeartProps {
  startPosition: [number, number, number];
  speed: number;
  wobble: number;
  scale: number;
  color: string;
  delay: number;
}

function Heart({ startPosition, speed, wobble, scale, color, delay }: HeartProps) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createHeartShape(0.3), []);
  const elapsed = useRef(-delay);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsed.current += delta;
    if (elapsed.current < 0) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const t = elapsed.current;
    ref.current.position.y = startPosition[1] + t * speed;
    ref.current.position.x = startPosition[0] + Math.sin(t * wobble) * 0.6;
    ref.current.rotation.z = Math.sin(t * 2) * 0.3;
    const progress = Math.min(t / 3, 1);
    const fade = progress < 0.1 ? progress / 0.1 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = fade;
    ref.current.scale.setScalar(scale * (0.8 + Math.sin(t * 3) * 0.2));
  });

  return (
    <mesh ref={ref} geometry={geometry} position={startPosition} visible={false}>
      <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

interface FloatingHeartsProps {
  count?: number;
  colors?: string[];
}

export function FloatingHearts({ count = 12, colors = ['#ef4444', '#f43f5e', '#ec4899', '#fb7185'] }: FloatingHeartsProps) {
  const hearts = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      startPosition: [
        (Math.random() - 0.5) * 4,
        -2.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5,
      ] as [number, number, number],
      speed: 0.8 + Math.random() * 0.6,
      wobble: 2 + Math.random() * 2,
      scale: 0.5 + Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
    }));
  }, [count, colors]);

  return (
    <group>
      {hearts.map((props) => (
        <Heart {...props} />
      ))}
    </group>
  );
}
