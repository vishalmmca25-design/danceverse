/**
 * 3d/RemoteAvatar.jsx
 * ───────────────────
 * Renders a real remote player received from the server.
 * - Lerps smoothly to server position (hides network latency)
 * - Displays the real player name sent on join — no bots
 * - Shows current zone as subtitle
 * - Turns red name tag when oxygen < 20%
 */

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";

const ASTRONAUT_URL = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

export default function RemoteAvatar({ player }) {
  const { scene } = useGLTF(ASTRONAUT_URL);
  const cloned    = useRef(scene.clone());
  const meshRef   = useRef();
  const target    = useRef(new THREE.Vector3(...(player.pos || [0, 0, 0])));

  const [labelPos, setLabelPos] = useState(player.pos || [0, 4.5, 0]);

  // ── Tint suit colour ──────────────────────────────────────────────────────
  useEffect(() => {
    cloned.current.traverse(child => {
      if (!child.isMesh) return;
      child.material                   = child.material.clone();
      child.material.color.set(player.color);
      child.material.emissive          = new THREE.Color(player.color);
      child.material.emissiveIntensity = 0.22;
      child.castShadow                 = true;
    });
  }, [player.color]);

  // ── Update lerp target when server sends new position ─────────────────────
  useEffect(() => {
    if (player.pos) target.current.set(...player.pos);
  }, [player.pos]);

  // ── Smooth lerp every frame ───────────────────────────────────────────────
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.lerp(target.current, 0.13);
    if (typeof player.rot === "number") meshRef.current.rotation.y = player.rot;
    const p = meshRef.current.position;
    setLabelPos([p.x, p.y + 4.5, p.z]);
  });

  const lowOxy   = (player.oxygen ?? 100) < 20;
  const tagColor = lowOxy ? "#ff4444" : player.color;

  return (
    <group>
      <primitive
        ref={meshRef}
        object={cloned.current}
        scale={2}
        position={player.pos || [0, 0, 0]}
      />

      {/* Name tag — real player name from server, shown immediately on join */}
      <Billboard position={labelPos}>
        <Html center>
          <div style={{
            background:    "rgba(0,0,0,0.88)",
            color:         tagColor,
            padding:       "3px 11px",
            borderRadius:  10,
            fontSize:      11,
            fontWeight:    700,
            fontFamily:    "'Orbitron', monospace",
            border:        `1.5px solid ${tagColor}66`,
            whiteSpace:    "nowrap",
            pointerEvents: "none",
            textShadow:    `0 0 8px ${tagColor}`,
            letterSpacing: 1,
            minWidth:      50,
            textAlign:     "center",
          }}>
            {lowOxy ? "⚠ " : "◉ "}{player.name}
            {player.zone && player.zone !== "Lunar Surface" && (
              <div style={{ fontSize: 8, opacity: 0.55, marginTop: 1 }}>
                {player.zone}
              </div>
            )}
          </div>
        </Html>
      </Billboard>

      <pointLight position={labelPos} intensity={0.3} color={player.color} distance={6} />
    </group>
  );
}
