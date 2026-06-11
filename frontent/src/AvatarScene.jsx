import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Sky, Html, Billboard, Float } from "@react-three/drei";
import { useRef, useState, useCallback } from "react";
import * as THREE from "react";
import * as THREEjs from "three";

// ─── Key state (global, shared) ───────────────────────────────────────────────
const keys = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
  window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLORS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff922b","#cc5de8","#20c997","#f06595"];
const NAMES  = ["Alex","Blake","Casey","Dana","Eden","Finn","Gia","Haru","Iris","Juno"];
const ZONES = [
  { name: "Plaza",      pos: [0,   0,   0],   radius: 8,  color: "#ffd93d" },
  { name: "Forest",     pos: [-25, 0,  -20],  radius: 12, color: "#6bcb77" },
  { name: "Beach",      pos: [28,  0,  -15],  radius: 10, color: "#4d96ff" },
  { name: "Market",     pos: [0,   0,  -30],  radius: 8,  color: "#ff922b" },
  { name: "Rooftop",    pos: [-20, 0,  20],   radius: 7,  color: "#cc5de8" },
];

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[120, 120, 30, 30]} />
        <meshStandardMaterial color="#2d4a2d" roughness={0.9} />
      </mesh>

      {/* Path cross */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[4, 80]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
        <planeGeometry args={[80, 4]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>

      {/* Zone circles (decorative pads) */}
      {ZONES.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[z.pos[0], 0.02, z.pos[2]]}>
          <circleGeometry args={[z.radius, 32]} />
          <meshStandardMaterial color={z.color} opacity={0.25} transparent roughness={0.7} />
        </mesh>
      ))}

      {/* Beach sand patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[28, 0.015, -15]}>
        <circleGeometry args={[11, 32]} />
        <meshStandardMaterial color="#f4d03f" roughness={0.95} />
      </mesh>

      {/* Forest patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[-25, 0.015, -20]}>
        <circleGeometry args={[13, 32]} />
        <meshStandardMaterial color="#1a5c1a" roughness={0.9} />
      </mesh>

      {/* Market cobblestone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.015, -30]}>
        <circleGeometry args={[9, 6]} />
        <meshStandardMaterial color="#7f8c8d" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Trees ────────────────────────────────────────────────────────────────────
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 2, 8]} />
        <meshStandardMaterial color="#6d4c41" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.5, 0]} castShadow>
        <coneGeometry args={[1.1, 2.5, 8]} />
        <meshStandardMaterial color="#388e3c" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Buildings / Structures ───────────────────────────────────────────────────
function Buildings() {
  const structs = [
    // Market stalls
    { pos: [-4, 1.5, -28], size: [3, 3, 3], color: "#e67e22" },
    { pos: [4,  1.5, -28], size: [3, 3, 3], color: "#8e44ad" },
    { pos: [0,  1.5, -36], size: [4, 3, 3], color: "#2980b9" },
    // Rooftop terrace base
    { pos: [-20, 2, 20], size: [10, 4, 10], color: "#bdc3c7" },
    // Beach huts
    { pos: [24, 1, -12], size: [3, 2, 3], color: "#f39c12" },
    { pos: [32, 1, -18], size: [3, 2, 3], color: "#e74c3c" },
    // Plaza fountain base
    { pos: [0, 0.3, 0], size: [3, 0.6, 3], color: "#ecf0f1" },
  ];
  return (
    <group>
      {structs.map((s, i) => (
        <mesh key={i} position={[s.pos[0], s.pos[1], s.pos[2]]} castShadow receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={s.color} roughness={0.6} />
        </mesh>
      ))}
      {/* Fountain pillar */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 3, 12]} />
        <meshStandardMaterial color="#95a5a6" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#3498db" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Rooftop railing */}
      {[-4,-2,0,2,4].map((x,i)=>(
        <mesh key={i} position={[-20+x, 5, 15]} castShadow>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshStandardMaterial color="#95a5a6" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Zone Labels ─────────────────────────────────────────────────────────────
function ZoneLabel({ zone }) {
  return (
    <Billboard position={[zone.pos[0], 4, zone.pos[2]]}>
      <Html center>
        <div style={{
          background: zone.color + "cc",
          color: "#fff",
          padding: "4px 10px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          textShadow: "0 1px 3px #0006",
          border: "1.5px solid #fff5",
        }}>{zone.name}</div>
      </Html>
    </Billboard>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ id, name, color, initialPos, controlKeys, followCamera = false, isPlayer, onPositionUpdate, remotePos }) {
  const { scene } = useGLTF("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
  const cloned = useRef(scene.clone());
  const ref = useRef();
  const { camera } = useThree();
  const velocity = useRef(new THREEjs.Vector3());
  const pos = useRef(new THREEjs.Vector3(...(initialPos || [0, 0, 0])));
  const [namePos, setNamePos] = useState(initialPos || [0, 0, 0]);
  const frameCount = useRef(0);

  // Tint the avatar to distinguish players
  useEffect(() => {
    cloned.current.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.set(color);
        child.castShadow = true;
      }
    });
  }, [color]);

  useFrame(() => {
    if (!ref.current) return;

    if (isPlayer) {
      const accel = 0.06;
      const friction = 0.88;
      const v = velocity.current;

      if (keys[controlKeys.forward])  v.z -= accel;
      if (keys[controlKeys.backward]) v.z += accel;
      if (keys[controlKeys.left])     v.x -= accel;
      if (keys[controlKeys.right])    v.x += accel;

      v.multiplyScalar(friction);
      pos.current.add(v);

      // Clamp to world
      pos.current.x = Math.max(-55, Math.min(55, pos.current.x));
      pos.current.z = Math.max(-55, Math.min(55, pos.current.z));

      ref.current.position.copy(pos.current);

      if (v.lengthSq() > 0.0001) {
        ref.current.rotation.y = Math.atan2(v.x, v.z);
      }

      if (followCamera) {
        const offset = new THREEjs.Vector3(0, 4, 10);
        const targetPos = ref.current.position.clone().add(offset);
        camera.position.lerp(targetPos, 0.08);
        camera.lookAt(ref.current.position);
      }

      frameCount.current++;
      if (frameCount.current % 3 === 0) {
        onPositionUpdate?.([pos.current.x, pos.current.y, pos.current.z]);
        setNamePos([pos.current.x, pos.current.y + 3.5, pos.current.z]);
      }
    } else if (remotePos) {
      // Smooth remote player movement
      const target = new THREEjs.Vector3(...remotePos);
      ref.current.position.lerp(target, 0.12);
      setNamePos([ref.current.position.x, ref.current.position.y + 3.5, ref.current.position.z]);
    }
  });

  return (
    <group>
      <primitive
        ref={ref}
        object={cloned.current}
        scale={2}
        position={initialPos}
      />
      {/* Floating name tag */}
      <Billboard position={namePos}>
        <Html center>
          <div style={{
            background: "#000a",
            color: color,
            padding: "2px 8px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "monospace",
            border: `1.5px solid ${color}88`,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}>{isPlayer ? "★ " : ""}{name}</div>
        </Html>
      </Billboard>
    </group>
  );
}

// ─── Simulated remote players ─────────────────────────────────────────────────
function useSimulatedPlayers(count = 5) {
  const [players, setPlayers] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: `bot_${i}`,
      name: NAMES[i % NAMES.length],
      color: COLORS[(i + 2) % COLORS.length],
      pos: [
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40,
      ],
      target: [
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40,
      ],
      speed: 0.02 + Math.random() * 0.03,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        const dx = p.target[0] - p.pos[0];
        const dz = p.target[2] - p.pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) {
          return { ...p, target: [(Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40] };
        }

        const nx = p.pos[0] + (dx / dist) * p.speed * 3;
        const nz = p.pos[2] + (dz / dist) * p.speed * 3;
        return { ...p, pos: [nx, 0, nz] };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return players;
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
function Minimap({ playerPos, botPlayers, playerColor }) {
  const SIZE = 160;
  const WORLD = 55;
  const toMap = (x, z) => ({
    x: ((x + WORLD) / (WORLD * 2)) * SIZE,
    y: ((z + WORLD) / (WORLD * 2)) * SIZE,
  });

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      width: SIZE, height: SIZE,
      background: "#0d1117ee",
      border: "2px solid #30363d",
      borderRadius: 12,
      overflow: "hidden",
      zIndex: 100,
    }}>
      <svg width={SIZE} height={SIZE}>
        {/* Zone circles */}
        {ZONES.map((z, i) => {
          const m = toMap(z.pos[0], z.pos[2]);
          return <circle key={i} cx={m.x} cy={m.y} r={(z.radius/WORLD)*SIZE*0.5}
            fill={z.color} fillOpacity={0.2} stroke={z.color} strokeOpacity={0.5} strokeWidth={1} />;
        })}
        {/* Bots */}
        {botPlayers.map(b => {
          const m = toMap(b.pos[0], b.pos[2]);
          return <circle key={b.id} cx={m.x} cy={m.y} r={3} fill={b.color} opacity={0.8} />;
        })}
        {/* Player */}
        {playerPos && (() => {
          const m = toMap(playerPos[0], playerPos[2]);
          return <>
            <circle cx={m.x} cy={m.y} r={6} fill={playerColor} />
            <circle cx={m.x} cy={m.y} r={6} fill="none" stroke="#fff" strokeWidth={1.5} />
          </>;
        })()}
      </svg>
      <div style={{
        position: "absolute", top: 4, left: 0, right: 0,
        textAlign: "center", color: "#8b949e", fontSize: 9,
        fontFamily: "monospace", letterSpacing: 1,
      }}>MINIMAP</div>
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function Chat({ messages, onSend, playerName, playerColor }) {
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, left: 20,
      width: 280, zIndex: 100,
      fontFamily: "monospace",
    }}>
      <div style={{
        background: "#0d1117cc",
        border: "1px solid #30363d",
        borderRadius: "10px 10px 0 0",
        padding: "6px 10px",
        color: "#8b949e", fontSize: 11,
        letterSpacing: 1,
      }}>WORLD CHAT</div>
      <div style={{
        background: "#0d111799",
        border: "1px solid #30363d",
        borderTop: "none",
        height: 120,
        overflowY: "auto",
        padding: "6px 10px",
        display: "flex", flexDirection: "column", gap: 3,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ fontSize: 12 }}>
            <span style={{ color: m.color, fontWeight: 700 }}>{m.name}: </span>
            <span style={{ color: "#e6edf3" }}>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{
        display: "flex",
        border: "1px solid #30363d",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        overflow: "hidden",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Say something..."
          style={{
            flex: 1, background: "#161b22", color: "#e6edf3",
            border: "none", outline: "none", padding: "6px 10px",
            fontSize: 12, fontFamily: "monospace",
          }}
        />
        <button
          onClick={send}
          style={{
            background: "#238636", color: "#fff",
            border: "none", cursor: "pointer",
            padding: "0 12px", fontSize: 12,
            fontFamily: "monospace",
          }}
        >→</button>
      </div>
    </div>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function HUD({ playerName, playerColor, zone, playerCount }) {
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 16, zIndex: 100, fontFamily: "monospace",
    }}>
      <div style={{
        background: "#0d1117cc", border: "1px solid #30363d",
        borderRadius: 8, padding: "6px 14px",
        color: playerColor, fontSize: 13, fontWeight: 700,
      }}>★ {playerName}</div>
      <div style={{
        background: "#0d1117cc", border: "1px solid #30363d",
        borderRadius: 8, padding: "6px 14px",
        color: "#8b949e", fontSize: 13,
      }}>📍 {zone}</div>
      <div style={{
        background: "#0d1117cc", border: "1px solid #30363d",
        borderRadius: 8, padding: "6px 14px",
        color: "#6bcb77", fontSize: 13,
      }}>👥 {playerCount} online</div>
    </div>
  );
}

// ─── Controls hint ────────────────────────────────────────────────────────────
function ControlsHint() {
  return (
    <div style={{
      position: "fixed", top: 16, right: 16,
      background: "#0d1117cc", border: "1px solid #30363d",
      borderRadius: 8, padding: "8px 14px", zIndex: 100,
      color: "#8b949e", fontSize: 11, fontFamily: "monospace",
      lineHeight: 1.7,
    }}>
      <div style={{ color: "#e6edf3", fontWeight: 700, marginBottom: 4 }}>CONTROLS</div>
      <div>W A S D — Move</div>
      <div>Mouse — Look around</div>
      <div>Enter — Chat</div>
    </div>
  );
}

// ─── Zone detector ────────────────────────────────────────────────────────────
function getZone(pos) {
  if (!pos) return "World";
  for (const z of ZONES) {
    const dx = pos[0] - z.pos[0];
    const dz = pos[2] - z.pos[2];
    if (Math.sqrt(dx * dx + dz * dz) < z.radius) return z.name;
  }
  return "World";
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function WorldScene({ botPlayers, playerPos, setPlayerPos, playerColor }) {
  const trees = [
    [-22,-20],[-25,-22],[-28,-18],[-20,-25],[-30,-22],[-24,-28],
    [-18,-18],[-32,-18],[-26,-15],[-21,-30]
  ];

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 30, 20]} intensity={1.5} castShadow
        shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 5, 0]} intensity={0.8} color="#ffd93d" />
      <pointLight position={[28, 3, -15]} intensity={0.5} color="#4d96ff" />

      <Ground />
      <Buildings />
      {trees.map(([x, z], i) => <Tree key={i} position={[x, 0, z]} />)}
      {ZONES.map((z, i) => <ZoneLabel key={i} zone={z} />)}

      {/* Local player */}
      <Avatar
        id="player"
        name="You"
        color={playerColor}
        initialPos={[0, 0, 5]}
        controlKeys={{ forward: "w", backward: "s", left: "a", right: "d" }}
        followCamera
        isPlayer
        onPositionUpdate={setPlayerPos}
      />

      {/* Simulated remote players */}
      {botPlayers.map(b => (
        <Avatar
          key={b.id}
          id={b.id}
          name={b.name}
          color={b.color}
          initialPos={b.pos}
          isPlayer={false}
          remotePos={b.pos}
        />
      ))}
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
const PLAYER_COLOR = COLORS[0];
const PLAYER_NAME  = "You";
const BOT_MESSAGES = [
  ["Eden",   COLORS[3], "Anyone want to explore the forest?"],
  ["Finn",   COLORS[4], "The beach is beautiful today 🌊"],
  ["Gia",    COLORS[5], "Market is open! Come trade!"],
  ["Haru",   COLORS[6], "Rooftop party later 🎉"],
  ["Alex",   COLORS[2], "Hello everyone!"],
];

export default function Metaverse() {
  const [playerPos, setPlayerPos]   = useState(null);
  const [messages, setMessages]     = useState([]);
  const botPlayers = useSimulatedPlayers(5);
  const zone = getZone(playerPos);

  // Spawn bot chat messages periodically
  useEffect(() => {
    let i = 0;
    const send = () => {
      const [name, color, text] = BOT_MESSAGES[i % BOT_MESSAGES.length];
      setMessages(prev => [...prev.slice(-30), { name, color, text }]);
      i++;
    };
    send();
    const t = setInterval(send, 5000 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);

  const handleSend = useCallback((text) => {
    setMessages(prev => [...prev.slice(-30), { name: PLAYER_NAME, color: PLAYER_COLOR, text }]);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a1628", overflow: "hidden" }}>
      <Canvas
        shadows
        camera={{ position: [0, 4, 10], fov: 65 }}
        style={{ width: "100%", height: "100%" }}
      >
        <WorldScene
          botPlayers={botPlayers}
          playerPos={playerPos}
          setPlayerPos={setPlayerPos}
          playerColor={PLAYER_COLOR}
        />
      </Canvas>

      <HUD
        playerName={PLAYER_NAME}
        playerColor={PLAYER_COLOR}
        zone={zone}
        playerCount={botPlayers.length + 1}
      />
      <ControlsHint />
      <Chat
        messages={messages}
        onSend={handleSend}
        playerName={PLAYER_NAME}
        playerColor={PLAYER_COLOR}
      />
      <Minimap
        playerPos={playerPos}
        botPlayers={botPlayers}
        playerColor={PLAYER_COLOR}
      />
    </div>
  );
}
