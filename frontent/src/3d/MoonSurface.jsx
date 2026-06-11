/**
 * 3d/MoonSurface.jsx
 * ──────────────────
 * The Moon's ground: regolith plane, impact craters, zone glow pads,
 * dust paths, footprint trails, and scattered rocks.
 */

import { useMemo } from "react";
import { ZONES } from "../constants";

export default function MoonSurface() {
  // Randomised rocks — stable across renders
  const rocks = useMemo(() =>
    Array.from({ length: 130 }, () => ({
      x:  (Math.random() - 0.5) * 110,
      z:  (Math.random() - 0.5) * 110,
      s:  0.1 + Math.random() * 0.6,
      ry: Math.random() * Math.PI * 2,
      rx: Math.random() * 0.5,
    })), []
  );

  const craters = useMemo(() => [
    { x: -28, z: -24, r: 13 }, { x:  14, z: -12, r: 6 }, { x: -15, z:  16, r: 7 },
    { x:  36, z:  -6, r:  5 }, { x: -38, z: -32, r: 8 }, { x:  22, z:  32, r: 6 },
    { x:   6, z: -44, r:  4 }, { x: -42, z:  18, r: 5 }, { x:  42, z:  10, r: 4 },
    { x:   0, z:  42, r:  6 }, { x:  18, z: -28, r: 5 }, { x: -10, z: -18, r: 4 },
  ], []);

  // Fixed footprint positions (no random at render time)
  const footprints = [
    [-10, -10], [10, -8], [-5, 8], [8, 5], [-3, 15], [12, -20],
  ];

  return (
    <group>
      {/* ── Base regolith ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[160, 160, 80, 80]} />
        <meshStandardMaterial color="#b4b4b4" roughness={0.97} metalness={0.02} />
      </mesh>

      {/* ── Crater floors ── */}
      {craters.map((c, i) => (
        <mesh key={`cf${i}`} rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow position={[c.x, 0.01, c.z]}>
          <circleGeometry args={[c.r, 40]} />
          <meshStandardMaterial color="#5a5a6a" roughness={0.99} />
        </mesh>
      ))}

      {/* ── Crater rims ── */}
      {craters.map((c, i) => (
        <mesh key={`cr${i}`} rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow position={[c.x, 0.04, c.z]}>
          <ringGeometry args={[c.r, c.r + 1.4, 40]} />
          <meshStandardMaterial color="#d4d4dc" roughness={0.95} />
        </mesh>
      ))}

      {/* ── Zone glow pads ── */}
      {ZONES.map((z, i) => (
        <mesh key={`zp${i}`} rotation={[-Math.PI / 2, 0, 0]}
              position={[z.pos[0], 0.03, z.pos[2]]}>
          <circleGeometry args={[z.r, 40]} />
          <meshStandardMaterial
            color={z.color} opacity={0.07} transparent
            emissive={z.color} emissiveIntensity={0.18}
          />
        </mesh>
      ))}

      {/* ── Dust paths (cross shape) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[2.5, 90]} />
        <meshStandardMaterial color="#c8c8c8" opacity={0.35} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[90, 2.5]} />
        <meshStandardMaterial color="#c8c8c8" opacity={0.35} transparent />
      </mesh>

      {/* ── Astronaut footprint trails ── */}
      {footprints.map(([x, z], i) => (
        <mesh key={`fp${i}`} rotation={[-Math.PI / 2, i * 0.4, 0]}
              position={[x, 0.02, z]}>
          <planeGeometry args={[0.2, 5]} />
          <meshStandardMaterial color="#aaaaaa" opacity={0.15} transparent />
        </mesh>
      ))}

      {/* ── Rocks ── */}
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.s * 0.35, r.z]}
              rotation={[r.rx, r.ry, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color="#7a7a8a" roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}
