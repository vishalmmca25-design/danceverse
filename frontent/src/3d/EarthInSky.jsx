/**
 * 3d/EarthInSky.jsx
 * ─────────────────
 * Animated Earth visible in the lunar sky.
 * Rotates slowly with ocean, continent patches, cloud layer,
 * and atmosphere ring.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function EarthInSky() {
  const earthRef = useRef();
  const cloudRef = useRef();

  useFrame((_, dt) => {
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.07;
  });

  // Continent patch positions (fixed — no Math.random at render)
  const continents = [
    [3, 2, -6], [-3, 1, 6], [5, -3, 3], [-4, -2, -4], [0, 5, 2], [-1, -4, 6],
  ];

  return (
    <group position={[-55, 42, -80]}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[9.6, 24, 24]} />
        <meshStandardMaterial
          color="#1a6bbf" opacity={0.07} transparent
          emissive="#1a6bbf" emissiveIntensity={0.5}
        />
      </mesh>

      {/* Ocean body */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[8, 48, 48]} />
        <meshStandardMaterial
          color="#1a6bbf" roughness={0.6}
          emissive="#0a3366" emissiveIntensity={0.3}
        />
      </mesh>

      {/* Continent patches */}
      {continents.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[1.5 + i * 0.15, 6, 6]} />
          <meshStandardMaterial color="#2d8a3e" roughness={0.8} opacity={0.85} transparent />
        </mesh>
      ))}

      {/* Cloud layer */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[8.45, 32, 32]} />
        <meshStandardMaterial color="#ffffff" opacity={0.14} transparent roughness={1} />
      </mesh>

      {/* Atmosphere ring */}
      <mesh rotation={[0.3, 0, 0.1]}>
        <torusGeometry args={[8.9, 0.7, 8, 60]} />
        <meshStandardMaterial
          color="#6ab4ff" opacity={0.11} transparent
          emissive="#4488ff" emissiveIntensity={0.4}
        />
      </mesh>

      {/* Earth ambient light (blue tint on scene) */}
      <pointLight intensity={1.5} color="#4488ff" distance={80} />
    </group>
  );
}
