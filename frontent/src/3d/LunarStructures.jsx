/**
 * 3d/LunarStructures.jsx
 * ──────────────────────
 * All static structures on the lunar surface:
 *   Apollo Base dome + modules + flag
 *   Comm Array tower + pulsing dish light
 *   Helium-3 Mine + pulsing ore tanks
 *   Solar Farm panel grid
 *   Ice Shelf crystal pillars
 *   Lunar Rover (parked)
 *   Floating asteroids
 *   Sun sphere + light
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

export default function LunarStructures() {
  const dishLightRef = useRef();
  const mineLightRef = useRef();

  // Pulsing lights
  useFrame(state => {
    const t = state.clock.elapsedTime;
    if (dishLightRef.current) dishLightRef.current.intensity = 1.2 + Math.sin(t * 2.0) * 0.6;
    if (mineLightRef.current) mineLightRef.current.intensity = 0.9 + Math.sin(t * 1.3) * 0.5;
  });

  // Ice shelf crystals — deterministic random (no re-randomise on render)
  const iceShelf = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const r     = 5 + ((i * 7919) % 100) / 25;
      const h     = 1.5 + ((i * 6271) % 100) / 40;
      const rB    = 0.18 + ((i * 3571) % 100) / 800;
      const rT    = 0.28 + ((i * 4127) % 100) / 700;
      return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, h, rB, rT };
    }), []
  );

  return (
    <group>
      {/* ════════════════════════════════
          APOLLO BASE
      ════════════════════════════════ */}
      <group>
        {/* Main dome (hemisphere) */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <sphereGeometry args={[3.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#dde4ee" metalness={0.6} roughness={0.3}
            transparent opacity={0.88}
            emissive="#ffd700" emissiveIntensity={0.07}
          />
        </mesh>

        {/* Base ring */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[3.6, 4.0, 0.5, 28]} />
          <meshStandardMaterial color="#aab0bb" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Connecting tunnels (N/S/E/W) */}
        {[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].map(([dx, , dz], i) => (
          <mesh key={i} position={[dx * 2.55, 0.7, dz * 2.55]}
                rotation={[0, i * Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 5.5, 12]} />
            <meshStandardMaterial color="#c8cdd6" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Side habitat modules */}
        {[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].map(([dx, , dz], i) => (
          <mesh key={`mod${i}`} position={[dx * 4.5, 1.2, dz * 4.5]} castShadow>
            <cylinderGeometry args={[1.7, 1.7, 2.4, 16]} />
            <meshStandardMaterial color="#d0d4de" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {/* Flag pole */}
        <mesh position={[2.5, 0, 2.5]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 4.2, 6]} />
          <meshStandardMaterial color="#cccccc" metalness={0.9} />
        </mesh>
        {/* Flag */}
        <mesh position={[3.1, 3.6, 2.5]} rotation={[0, 0, -0.08]}>
          <planeGeometry args={[1.3, 0.75]} />
          <meshStandardMaterial color="#1133bb" side={THREE.DoubleSide} />
        </mesh>

        <pointLight position={[0, 3, 0]} intensity={1.3} color="#ffd700" distance={16} />
      </group>

      {/* ════════════════════════════════
          COMM ARRAY
      ════════════════════════════════ */}
      <group position={[-24, 0, 24]}>
        {/* Tower */}
        <mesh position={[0, 5.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.4, 11, 8]} />
          <meshStandardMaterial color="#8899aa" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Main dish */}
        <mesh position={[0, 9.5, 0]} rotation={[-0.55, 0, 0]}>
          <coneGeometry args={[2.6, 0.5, 20, 1, true]} />
          <meshStandardMaterial
            color="#7a8899" metalness={0.85} roughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Feed point */}
        <mesh position={[0, 10.1, 0.9]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={3} />
        </mesh>
        <pointLight ref={dishLightRef} position={[0, 10.5, 0]}
          intensity={1.5} color="#39ff14" distance={22} />
        {/* Brace arms */}
        {[-1, 1].map((s, i) => (
          <mesh key={i} position={[s * 2, 4.5, 0]} rotation={[0, 0, s * 0.35]}>
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshStandardMaterial color="#667788" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ════════════════════════════════
          HELIUM-3 MINE
      ════════════════════════════════ */}
      <group position={[30, 0, -20]}>
        {/* Shaft entrance */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[6, 1, 4]} />
          <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
        </mesh>
        {/* Processing tower */}
        <mesh position={[0, 3.5, 0]} castShadow>
          <boxGeometry args={[3, 6, 3]} />
          <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Glowing ore tanks */}
        {[-1.5, 0, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 7.2, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 2.2, 12]} />
            <meshStandardMaterial
              color="#7fffee" emissive="#7fffee"
              emissiveIntensity={1.4} transparent opacity={0.9}
            />
          </mesh>
        ))}
        <pointLight ref={mineLightRef} position={[0, 7.5, 0]}
          intensity={1.0} color="#7fffee" distance={16} />
        {/* Conveyor arm */}
        <mesh position={[4.5, 2.5, 0]} rotation={[0, 0, -0.45]} castShadow>
          <boxGeometry args={[5.5, 0.28, 0.8]} />
          <meshStandardMaterial color="#445566" metalness={0.8} />
        </mesh>
      </group>

      {/* ════════════════════════════════
          SOLAR FARM
      ════════════════════════════════ */}
      <group position={[26, 0, 22]}>
        {Array.from({ length: 16 }, (_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          return (
            <group key={i} position={[col * 3 - 4.5, 0, row * 3 - 4.5]}>
              <mesh position={[0, 1.5, 0]} rotation={[-0.35, 0, 0]} castShadow>
                <boxGeometry args={[2.5, 0.05, 1.6]} />
                <meshStandardMaterial
                  color="#111e3c" metalness={0.6}
                  emissive="#223388" emissiveIntensity={0.35}
                />
              </mesh>
              <mesh position={[0, 0.75, 0]}>
                <boxGeometry args={[0.1, 1.5, 0.1]} />
                <meshStandardMaterial color="#888888" metalness={0.9} />
              </mesh>
            </group>
          );
        })}
        <pointLight position={[0, 3, 0]} intensity={0.7} color="#ffe566" distance={20} />
      </group>

      {/* ════════════════════════════════
          ICE SHELF
      ════════════════════════════════ */}
      <group position={[0, 0, -36]}>
        {iceShelf.map((c, i) => (
          <mesh key={i} position={[c.x, c.h / 2, c.z]} castShadow>
            <cylinderGeometry args={[c.rB, c.rT, c.h, 7]} />
            <meshStandardMaterial
              color="#e0f8ff" emissive="#aaddff" emissiveIntensity={0.4}
              transparent opacity={0.8} roughness={0.1} metalness={0.1}
            />
          </mesh>
        ))}
        <pointLight position={[0, 5, 0]} intensity={0.9} color="#c8f0ff" distance={18} />
      </group>

      {/* ════════════════════════════════
          LUNAR ROVER (parked)
      ════════════════════════════════ */}
      <group position={[7, 0, 5]} rotation={[0, 0.7, 0]}>
        {/* Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[3.2, 0.8, 1.9]} />
          <meshStandardMaterial color="#b8c0cc" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Wheels */}
        {[[-1.3,0,-1],[1.3,0,-1],[-1.3,0,1],[1.3,0,1]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, 0.26, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.28, 14]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
          </mesh>
        ))}
        {/* Solar panel on top */}
        <mesh position={[0, 1.1, 0]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[2.6, 0.05, 1.2]} />
          <meshStandardMaterial
            color="#111e3c" metalness={0.5}
            emissive="#223388" emissiveIntensity={0.3}
          />
        </mesh>
        {/* Antenna */}
        <mesh position={[1.1, 1.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
          <meshStandardMaterial color="#bbbbbb" metalness={0.9} />
        </mesh>
      </group>

      {/* ════════════════════════════════
          FLOATING ASTEROIDS
      ════════════════════════════════ */}
      <Float speed={0.35} rotationIntensity={0.8} floatIntensity={1.8}>
        <mesh position={[48, 20, -60]} castShadow>
          <dodecahedronGeometry args={[2.8, 0]} />
          <meshStandardMaterial color="#78788a" roughness={0.95} />
        </mesh>
      </Float>
      <Float speed={0.25} rotationIntensity={1.0} floatIntensity={1.2}>
        <mesh position={[-55, 15, -40]}>
          <octahedronGeometry args={[1.6, 0]} />
          <meshStandardMaterial color="#888898" roughness={0.9} />
        </mesh>
      </Float>

      {/* ════════════════════════════════
          SUN (visible sphere + light)
      ════════════════════════════════ */}
      <mesh position={[100, 60, -80]}>
        <sphereGeometry args={[5, 20, 20]} />
        <meshStandardMaterial color="#fffbe8" emissive="#fffbe8" emissiveIntensity={5} />
      </mesh>
      <pointLight position={[100, 60, -80]} intensity={3} color="#fffbe8" distance={600} />
    </group>
  );
}
