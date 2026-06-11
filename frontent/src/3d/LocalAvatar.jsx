/**
 * 3d/LocalAvatar.jsx
 * ──────────────────
 * The local player's astronaut avatar.
 * - Reads KEYS for WASD + Arrow movement
 * - Applies low-gravity jump (SPACE)
 * - Client-side prediction: moves immediately, sends to server every frame
 * - Smooth camera follow
 * - Floating name tag (own callsign)
 */

import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { KEYS, GRAVITY, JUMP_FORCE } from "../constants";

const ASTRONAUT_URL = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

export default function LocalAvatar({ color, name, sendMove, onPosChange }) {
  const { scene }  = useGLTF(ASTRONAUT_URL);
  const cloned     = useRef(scene.clone());
  const meshRef    = useRef();
  const { camera } = useThree();

  const vel      = useRef(new THREE.Vector3());
  const pos      = useRef(new THREE.Vector3(0, 0, 8));
  const onGround = useRef(true);
  const frameN   = useRef(0);

  const [labelPos, setLabelPos] = useState([0, 4.5, 8]);

  // ── Tint suit colour ──────────────────────────────────────────────────────
  useEffect(() => {
    cloned.current.traverse(child => {
      if (!child.isMesh) return;
      child.material                   = child.material.clone();
      child.material.color.set(color);
      child.material.emissive          = new THREE.Color(color);
      child.material.emissiveIntensity = 0.22;
      child.castShadow                 = true;
    });
  }, [color]);

  // ── Low-gravity jump ──────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      if (e.code === "Space" && onGround.current) {
        vel.current.y  = JUMP_FORCE;
        onGround.current = false;
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // ── Physics + movement loop ───────────────────────────────────────────────
  useFrame(() => {
    if (!meshRef.current) return;
    const v      = vel.current;
    const accel   = 0.08;
    const friction = 0.82;

    if (KEYS["KeyW"] || KEYS["ArrowUp"])    v.z -= accel;
    if (KEYS["KeyS"] || KEYS["ArrowDown"])  v.z += accel;
    if (KEYS["KeyA"] || KEYS["ArrowLeft"])  v.x -= accel;
    if (KEYS["KeyD"] || KEYS["ArrowRight"]) v.x += accel;

    v.y += GRAVITY;
    v.x *= friction;
    v.z *= friction;
    pos.current.add(v);

    // Ground collision
    if (pos.current.y <= 0) {
      pos.current.y  = 0;
      v.y            = 0;
      onGround.current = true;
    }

    // World bounds
    pos.current.x = Math.max(-62, Math.min(62, pos.current.x));
    pos.current.z = Math.max(-62, Math.min(62, pos.current.z));

    meshRef.current.position.copy(pos.current);

    // Rotate to face movement direction
    const horiz = new THREE.Vector2(v.x, v.z);
    if (horiz.lengthSq() > 0.0001)
      meshRef.current.rotation.y = Math.atan2(v.x, v.z);

    // Smooth camera follow
    camera.position.lerp(
      pos.current.clone().add(new THREE.Vector3(0, 5, 12)),
      0.15,
    );
    camera.lookAt(pos.current);

    // Send position to server every frame (volatile — no ACK)
    sendMove(
      [pos.current.x, pos.current.y, pos.current.z],
      meshRef.current.rotation.y,
    );

    // Update UI / minimap every 3 frames (cheaper)
    frameN.current++;
    if (frameN.current % 3 === 0) {
      const p = [pos.current.x, pos.current.y, pos.current.z];
      onPosChange(p);
      setLabelPos([pos.current.x, pos.current.y + 4.5, pos.current.z]);
    }
  });

  return (
    <group>
      <primitive ref={meshRef} object={cloned.current} scale={2} position={[0, 0, 8]} />

      {/* Own name tag */}
      <Billboard position={labelPos}>
        <Html center>
          <div style={{
            background:    "rgba(0,0,0,0.88)",
            color,
            padding:       "3px 11px",
            borderRadius:  10,
            fontSize:      12,
            fontWeight:    900,
            fontFamily:    "'Orbitron', monospace",
            border:        `2px solid ${color}99`,
            whiteSpace:    "nowrap",
            pointerEvents: "none",
            textShadow:    `0 0 12px ${color}`,
            letterSpacing: 1,
          }}>
            ▶ {name}
          </div>
        </Html>
      </Billboard>

      <pointLight position={labelPos} intensity={0.35} color={color} distance={6} />
    </group>
  );
}
