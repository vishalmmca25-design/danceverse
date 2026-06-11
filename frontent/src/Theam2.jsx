/**
 * MoonMetaverse.jsx — Production Multiplayer Frontend
 * =====================================================
 * Real players only. No bots. Name tags shown on join.
 *
 * npm install @react-three/fiber @react-three/drei three socket.io-client
 *
 * Backend: uvicorn main:socket_app --host 0.0.0.0 --port 3001 --reload
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Billboard, Html, Stars, Float } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════════════ */
const SERVER_URL = "http://localhost:3001";
const GRAVITY    = -0.012;
const JUMP_FORCE =  0.22;

const SUIT_COLORS = [
  "#ffd700","#39ff14","#00cfff","#ff6eb4",
  "#ff9500","#c77dff","#00ffcc","#ff4444",
];

const ZONES = [
  { name:"Apollo Base",     pos:[ 0, 0,  0], r:10, color:"#ffd700", icon:"🏛" },
  { name:"Sea of Tranquil", pos:[-28,0,-24], r:13, color:"#aaaacc", icon:"🌊" },
  { name:"Helium-3 Mine",   pos:[ 30,0,-20], r:10, color:"#7fffee", icon:"⚗" },
  { name:"Lunar Ice Shelf", pos:[ 0, 0,-36], r: 9, color:"#c8f0ff", icon:"🧊" },
  { name:"Comm Array",      pos:[-24,0, 24], r: 8, color:"#39ff14", icon:"📡" },
  { name:"Solar Farm",      pos:[ 26,0, 22], r: 9, color:"#ffe566", icon:"☀" },
];

// Global key state — set outside React so useFrame can read it without closure
const KEYS = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", e => { KEYS[e.code] = true; });
  window.addEventListener("keyup",   e => { KEYS[e.code] = false; });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOCKET HOOK
   Connects to FastAPI backend, manages all multiplayer state.
═══════════════════════════════════════════════════════════════════════════ */
function useMoonSocket(url) {
  const socketRef = useRef(null);

  const [connected,    setConnected]    = useState(false);
  const [ping,         setPing]         = useState(0);
  const [myPlayer,     setMyPlayer]     = useState(null);
  const [players,      setPlayers]      = useState({});   // id -> player
  const [messages,     setMessages]     = useState([]);
  const [zone,         setZone]         = useState("Lunar Surface");
  const [rooms,        setRooms]        = useState([]);
  const [meteorActive, setMeteorActive] = useState(false);
  const [meteorMsg,    setMeteorMsg]    = useState("");

  const pushMsg = useCallback((text, color = "#556677", name = "SYSTEM") => {
    const msg = { id: Math.random().toString(36).slice(2), name, color, text,
                  timestamp: Date.now(), system: true };
    setMessages(p => [...p.slice(-100), msg]);
  }, []);

  useEffect(() => {
    const s = io(url, { transports: ["websocket"], reconnectionDelay: 1500 });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      pushMsg("Connected to Lunar Server", "#39ff14");
    });
    s.on("disconnect", () => {
      setConnected(false);
      setMyPlayer(null);
      setPlayers({});
      pushMsg("Disconnected from server", "#ff4444");
    });

    // Latency
    const pingIv = setInterval(() => {
      const t = Date.now();
      s.emit("ping_client", t);
    }, 3000);
    s.on("pong_server", t => setPing(Date.now() - t));

    // Rooms
    s.on("rooms_list",  ({ rooms: r }) => setRooms(r));
    s.on("room_created",({ room })     => setRooms(p => [...p, room]));
    s.on("room_closed", ({ message })  => pushMsg(message, "#ff4444"));

    // Join success
    s.on("joined_room", ({ player, existingPlayers, roomId, roomName }) => {
      setMyPlayer(player);
      setZone(player.zone);
      const init = {};
      existingPlayers.forEach(p => { init[p.id] = p; });
      setPlayers(init);
      const count = existingPlayers.length;
      pushMsg(
        count === 0
          ? `Entered ${roomName} [${roomId}] — you are the first colonist`
          : `Entered ${roomName} [${roomId}] — ${count} colonist${count !== 1 ? "s" : ""} present`,
        "#ffd700",
      );
    });
    s.on("join_error", ({ error }) => pushMsg(`Join failed: ${error}`, "#ff5555"));
    s.on("left_room",  ()          => { setMyPlayer(null); setPlayers({}); });

    // Player lifecycle — NAME shown on join
    s.on("player_joined", p => {
      setPlayers(prev => ({ ...prev, [p.id]: p }));
      pushMsg(`${p.name} has landed on the Moon`, p.color);
    });
    s.on("player_left", ({ id, name }) => {
      setPlayers(prev => { const n = { ...prev }; delete n[id]; return n; });
      pushMsg(`${name} left the colony`, "#556677");
    });

    // Real-time position deltas
    s.on("player_moved", ({ id, pos, rot }) => {
      setPlayers(prev =>
        prev[id] ? { ...prev, [id]: { ...prev[id], pos, rot } } : prev
      );
    });
    s.on("player_zone", ({ id, zone: z }) => {
      setPlayers(prev =>
        prev[id] ? { ...prev, [id]: { ...prev[id], zone: z } } : prev
      );
    });

    // Own zone change
    s.on("zone_changed", ({ zone: z }) => {
      setZone(z);
      pushMsg(`Entered: ${z}`, "#ffd700");
    });

    // Oxygen warning
    s.on("player_low_oxygen", ({ name, oxygen }) => {
      pushMsg(`LOW O2 WARNING — ${name} at ${Math.round(oxygen)}%`, "#ff4444");
    });

    // Emotes
    s.on("player_emote", ({ name, emote }) => {
      const labels = {
        wave:"waves", jump:"jumps", dance:"dances",
        salute:"salutes", point:"points",
      };
      pushMsg(`${name} ${labels[emote] || emote}`, "#aaaaee");
    });

    // Chat
    s.on("chat_message", msg => {
      setMessages(p => [...p.slice(-100), msg]);
    });

    // Full-state snapshot (fallback sync every 2s from server)
    s.on("world_snapshot", ({ players: snap }) => {
      setPlayers(prev => {
        const next = { ...prev };
        snap.forEach(p => { next[p.id] = { ...next[p.id], ...p }; });
        return next;
      });
    });

    // Server-driven events
    s.on("meteor_shower_start", ({ message, duration }) => {
      setMeteorActive(true);
      setMeteorMsg(message);
      pushMsg(`ALERT: ${message}`, "#ff3333");
      setTimeout(() => setMeteorActive(false), duration);
    });
    s.on("meteor_shower_end", ({ message }) => {
      setMeteorActive(false);
      setMeteorMsg("");
      pushMsg(message, "#39ff14");
    });

    return () => {
      clearInterval(pingIv);
      s.disconnect();
    };
  }, [url, pushMsg]);

  const listRooms  = useCallback(() => socketRef.current?.emit("list_rooms_ws"), []);
  const createRoom = useCallback((name, pw) =>
    socketRef.current?.emit("create_room_ws", { roomName: name, password: pw }), []);
  const joinRoom   = useCallback((roomId, playerName, color, pw) =>
    socketRef.current?.emit("join_room", { roomId, playerName, color, password: pw }), []);
  const leaveRoom  = useCallback(() =>
    socketRef.current?.emit("leave_room_ws"), []);
  // volatile = no retry, best for high-frequency position updates
  const sendMove   = useCallback((pos, rot) =>
    socketRef.current?.volatile.emit("player_move", { pos, rot }), []);
  const sendChat   = useCallback((text) =>
    socketRef.current?.emit("chat_message", { text }), []);
  const sendOxygen = useCallback((oxygen) =>
    socketRef.current?.emit("oxygen_update", { oxygen }), []);
  const sendEmote  = useCallback((emote) =>
    socketRef.current?.emit("player_emote", { emote }), []);

  return {
    connected, ping, myPlayer, players, messages,
    zone, rooms, meteorActive, meteorMsg,
    listRooms, createRoom, joinRoom, leaveRoom,
    sendMove, sendChat, sendOxygen, sendEmote,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D — MOON SURFACE
═══════════════════════════════════════════════════════════════════════════ */
function MoonSurface() {
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
    { x:-28, z:-24, r:13 }, { x: 14, z:-12, r:6 }, { x:-15, z: 16, r:7 },
    { x: 36, z: -6, r: 5 }, { x:-38, z:-32, r:8 }, { x: 22, z: 32, r:6 },
    { x:  6, z:-44, r: 4 }, { x:-42, z: 18, r:5 }, { x: 42, z: 10, r:4 },
    { x:  0, z: 42, r: 6 }, { x: 18, z:-28, r:5 }, { x:-10, z:-18, r:4 },
  ], []);

  return (
    <group>
      {/* Base regolith */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[160, 160, 80, 80]} />
        <meshStandardMaterial color="#b4b4b4" roughness={0.97} metalness={0.02} />
      </mesh>

      {/* Crater floors */}
      {craters.map((c, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow
              position={[c.x, 0.01, c.z]}>
          <circleGeometry args={[c.r, 40]} />
          <meshStandardMaterial color="#5a5a6a" roughness={0.99} />
        </mesh>
      ))}

      {/* Crater rims */}
      {craters.map((c, i) => (
        <mesh key={`rim${i}`} rotation={[-Math.PI / 2, 0, 0]} receiveShadow
              position={[c.x, 0.04, c.z]}>
          <ringGeometry args={[c.r, c.r + 1.4, 40]} />
          <meshStandardMaterial color="#d4d4dc" roughness={0.95} />
        </mesh>
      ))}

      {/* Zone glow pads */}
      {ZONES.map((z, i) => (
        <mesh key={`zp${i}`} rotation={[-Math.PI / 2, 0, 0]}
              position={[z.pos[0], 0.03, z.pos[2]]}>
          <circleGeometry args={[z.r, 40]} />
          <meshStandardMaterial color={z.color} opacity={0.07} transparent
            emissive={z.color} emissiveIntensity={0.18} />
        </mesh>
      ))}

      {/* Dust paths — cross */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[2.5, 90]} />
        <meshStandardMaterial color="#c8c8c8" opacity={0.35} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[90, 2.5]} />
        <meshStandardMaterial color="#c8c8c8" opacity={0.35} transparent />
      </mesh>

      {/* Astronaut footprint trails */}
      {[[-10,-10],[10,-8],[-5,8],[8,5],[-3,15],[12,-20]].map(([x, z], i) => (
        <mesh key={`fp${i}`} rotation={[-Math.PI / 2, i * 0.4, 0]}
              position={[x, 0.02, z]}>
          <planeGeometry args={[0.2, 5]} />
          <meshStandardMaterial color="#aaaaaa" opacity={0.15} transparent />
        </mesh>
      ))}

      {/* Rocks */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   3D — EARTH IN SKY
═══════════════════════════════════════════════════════════════════════════ */
function EarthInSky() {
  const earthRef = useRef();
  const cloudRef = useRef();

  useFrame((_, dt) => {
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.07;
  });

  return (
    <group position={[-55, 42, -80]}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[9.6, 24, 24]} />
        <meshStandardMaterial color="#1a6bbf" opacity={0.07} transparent
          emissive="#1a6bbf" emissiveIntensity={0.5} />
      </mesh>
      {/* Ocean body */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[8, 48, 48]} />
        <meshStandardMaterial color="#1a6bbf" roughness={0.6}
          emissive="#0a3366" emissiveIntensity={0.3} />
      </mesh>
      {/* Continents */}
      {[[3,2,-6],[-3,1,6],[5,-3,3],[-4,-2,-4],[0,5,2],[-1,-4,6]].map(([x,y,z],i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[1.5 + i * 0.15, 6, 6]} />
          <meshStandardMaterial color="#2d8a3e" roughness={0.8}
            opacity={0.85} transparent />
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
        <meshStandardMaterial color="#6ab4ff" opacity={0.11} transparent
          emissive="#4488ff" emissiveIntensity={0.4} />
      </mesh>
      <pointLight intensity={1.5} color="#4488ff" distance={80} />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D — LUNAR STRUCTURES
═══════════════════════════════════════════════════════════════════════════ */
function LunarStructures() {
  const dishLightRef = useRef();
  const mineLightRef = useRef();

  useFrame(state => {
    const t = state.clock.elapsedTime;
    if (dishLightRef.current) dishLightRef.current.intensity = 1.2 + Math.sin(t * 2.0) * 0.6;
    if (mineLightRef.current) mineLightRef.current.intensity = 0.9 + Math.sin(t * 1.3) * 0.5;
  });

  // Ice shelf crystals — stable random, computed once
  const iceShelf = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const r     = 5 + ((i * 7919) % 100) / 25;
      const h     = 1.5 + ((i * 6271) % 100) / 40;
      const rBase = 0.18 + ((i * 3571) % 100) / 800;
      const rTop  = 0.28 + ((i * 4127) % 100) / 700;
      return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, h, rBase, rTop };
    }), []
  );

  return (
    <group>
      {/* ── Apollo Base ── */}
      <group>
        {/* Main dome */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <sphereGeometry args={[3.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#dde4ee" metalness={0.6} roughness={0.3}
            transparent opacity={0.88} emissive="#ffd700" emissiveIntensity={0.07} />
        </mesh>
        {/* Base ring */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[3.6, 4.0, 0.5, 28]} />
          <meshStandardMaterial color="#aab0bb" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Connecting tunnels */}
        {[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].map(([dx,dy,dz], i) => (
          <mesh key={i} position={[dx*2.55, 0.7, dz*2.55]}
                rotation={[0, i * Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 5.5, 12]} />
            <meshStandardMaterial color="#c8cdd6" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {/* Side modules */}
        {[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].map(([dx,dy,dz], i) => (
          <mesh key={`mod${i}`} position={[dx*4.5, 1.2, dz*4.5]} castShadow>
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

      {/* ── Comm Array ── */}
      <group position={[-24, 0, 24]}>
        <mesh position={[0, 5.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.4, 11, 8]} />
          <meshStandardMaterial color="#8899aa" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 9.5, 0]} rotation={[-0.55, 0, 0]}>
          <coneGeometry args={[2.6, 0.5, 20, 1, true]} />
          <meshStandardMaterial color="#7a8899" metalness={0.85} roughness={0.15}
            side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 10.1, 0.9]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={3} />
        </mesh>
        <pointLight ref={dishLightRef} position={[0, 10.5, 0]}
          intensity={1.5} color="#39ff14" distance={22} />
        {[-1, 1].map((s, i) => (
          <mesh key={i} position={[s * 2, 4.5, 0]} rotation={[0, 0, s * 0.35]}>
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshStandardMaterial color="#667788" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ── Helium-3 Mine ── */}
      <group position={[30, 0, -20]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[6, 1, 4]} />
          <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.5, 0]} castShadow>
          <boxGeometry args={[3, 6, 3]} />
          <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
        </mesh>
        {[-1.5, 0, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 7.2, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 2.2, 12]} />
            <meshStandardMaterial color="#7fffee" emissive="#7fffee"
              emissiveIntensity={1.4} transparent opacity={0.9} />
          </mesh>
        ))}
        <pointLight ref={mineLightRef} position={[0, 7.5, 0]}
          intensity={1.0} color="#7fffee" distance={16} />
        <mesh position={[4.5, 2.5, 0]} rotation={[0, 0, -0.45]} castShadow>
          <boxGeometry args={[5.5, 0.28, 0.8]} />
          <meshStandardMaterial color="#445566" metalness={0.8} />
        </mesh>
      </group>

      {/* ── Solar Farm ── */}
      <group position={[26, 0, 22]}>
        {Array.from({ length: 16 }, (_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          return (
            <group key={i} position={[col * 3 - 4.5, 0, row * 3 - 4.5]}>
              <mesh position={[0, 1.5, 0]} rotation={[-0.35, 0, 0]} castShadow>
                <boxGeometry args={[2.5, 0.05, 1.6]} />
                <meshStandardMaterial color="#111e3c" metalness={0.6}
                  emissive="#223388" emissiveIntensity={0.35} />
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

      {/* ── Ice Shelf ── */}
      <group position={[0, 0, -36]}>
        {iceShelf.map((c, i) => (
          <mesh key={i} position={[c.x, c.h / 2, c.z]} castShadow>
            <cylinderGeometry args={[c.rBase, c.rTop, c.h, 7]} />
            <meshStandardMaterial color="#e0f8ff" emissive="#aaddff"
              emissiveIntensity={0.4} transparent opacity={0.8}
              roughness={0.1} metalness={0.1} />
          </mesh>
        ))}
        <pointLight position={[0, 5, 0]} intensity={0.9} color="#c8f0ff" distance={18} />
      </group>

      {/* ── Lunar Rover ── */}
      <group position={[7, 0, 5]} rotation={[0, 0.7, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[3.2, 0.8, 1.9]} />
          <meshStandardMaterial color="#b8c0cc" metalness={0.7} roughness={0.3} />
        </mesh>
        {[[-1.3, 0, -1], [1.3, 0, -1], [-1.3, 0, 1], [1.3, 0, 1]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, 0.26, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.28, 14]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 1.1, 0]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[2.6, 0.05, 1.2]} />
          <meshStandardMaterial color="#111e3c" metalness={0.5}
            emissive="#223388" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[1.1, 1.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
          <meshStandardMaterial color="#bbbbbb" metalness={0.9} />
        </mesh>
      </group>

      {/* ── Floating asteroids ── */}
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

      {/* ── Sun ── */}
      <mesh position={[100, 60, -80]}>
        <sphereGeometry args={[5, 20, 20]} />
        <meshStandardMaterial color="#fffbe8" emissive="#fffbe8" emissiveIntensity={5} />
      </mesh>
      <pointLight position={[100, 60, -80]} intensity={3} color="#fffbe8" distance={600} />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D — ZONE LABEL
═══════════════════════════════════════════════════════════════════════════ */
function ZoneLabel({ zone }) {
  return (
    <Billboard position={[zone.pos[0], 7.5, zone.pos[2]]}>
      <Html center>
        <div style={{
          background: "rgba(0,0,0,0.78)", color: zone.color,
          padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          fontFamily: "'Orbitron', monospace", whiteSpace: "nowrap",
          pointerEvents: "none", border: `1px solid ${zone.color}55`,
          textShadow: `0 0 10px ${zone.color}`, letterSpacing: 1,
        }}>
          {zone.icon} {zone.name}
        </div>
      </Html>
    </Billboard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D — LOCAL PLAYER AVATAR
   Reads KEYS, applies low-gravity physics, sends position to server.
═══════════════════════════════════════════════════════════════════════════ */
function LocalAvatar({ color, name, sendMove, onPosChange }) {
  const { scene }  = useGLTF("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
  const cloned     = useRef(scene.clone());
  const meshRef    = useRef();
  const { camera } = useThree();
  const vel        = useRef(new THREE.Vector3());
  const pos        = useRef(new THREE.Vector3(0, 0, 8));
  const onGround   = useRef(true);
  const frameN     = useRef(0);
  const [labelPos, setLabelPos] = useState([0, 4.5, 8]);

  // Tint suit colour
  useEffect(() => {
    cloned.current.traverse(child => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.material.color.set(color);
      child.material.emissive = new THREE.Color(color);
      child.material.emissiveIntensity = 0.22;
      child.castShadow = true;
    });
  }, [color]);

  // Jump
  useEffect(() => {
    const fn = e => {
      if (e.code === "Space" && onGround.current) {
        vel.current.y = JUMP_FORCE;
        onGround.current = false;
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const v = vel.current;
    const accel = 0.062, friction = 0.87;

    if (KEYS["KeyW"] || KEYS["ArrowUp"])    v.z -= accel;
    if (KEYS["KeyS"] || KEYS["ArrowDown"])  v.z += accel;
    if (KEYS["KeyA"] || KEYS["ArrowLeft"])  v.x -= accel;
    if (KEYS["KeyD"] || KEYS["ArrowRight"]) v.x += accel;

    v.y += GRAVITY;
    v.x *= friction;
    v.z *= friction;
    pos.current.add(v);

    if (pos.current.y <= 0) {
      pos.current.y = 0;
      v.y = 0;
      onGround.current = true;
    }
    pos.current.x = Math.max(-62, Math.min(62, pos.current.x));
    pos.current.z = Math.max(-62, Math.min(62, pos.current.z));

    meshRef.current.position.copy(pos.current);

    const horiz = new THREE.Vector2(v.x, v.z);
    if (horiz.lengthSq() > 0.0001)
      meshRef.current.rotation.y = Math.atan2(v.x, v.z);

    // Smooth camera follow
    camera.position.lerp(
      pos.current.clone().add(new THREE.Vector3(0, 5, 12)), 0.07
    );
    camera.lookAt(pos.current);

    // Send to server every 3 frames
    frameN.current++;
    if (frameN.current % 3 === 0) {
      const p = [pos.current.x, pos.current.y, pos.current.z];
      sendMove(p, meshRef.current.rotation.y);
      onPosChange(p);
      setLabelPos([pos.current.x, pos.current.y + 4.5, pos.current.z]);
    }
  });

  return (
    <group>
      <primitive ref={meshRef} object={cloned.current} scale={2} position={[0, 0, 8]} />
      <Billboard position={labelPos}>
        <Html center>
          <div style={{
            background: "rgba(0,0,0,0.88)", color,
            padding: "3px 11px", borderRadius: 10,
            fontSize: 12, fontWeight: 900,
            fontFamily: "'Orbitron', monospace",
            border: `2px solid ${color}99`,
            whiteSpace: "nowrap", pointerEvents: "none",
            textShadow: `0 0 12px ${color}`, letterSpacing: 1,
          }}>
            ▶ {name}
          </div>
        </Html>
      </Billboard>
      <pointLight position={labelPos} intensity={0.35} color={color} distance={6} />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D — REMOTE PLAYER AVATAR
   Lerps to server position. Shows real player name — no bots.
═══════════════════════════════════════════════════════════════════════════ */
function RemoteAvatar({ player }) {
  const { scene } = useGLTF("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
  const cloned    = useRef(scene.clone());
  const meshRef   = useRef();
  const target    = useRef(new THREE.Vector3(...(player.pos || [0, 0, 0])));
  const [labelPos, setLabelPos] = useState([0, 4.5, 0]);

  // Tint suit colour
  useEffect(() => {
    cloned.current.traverse(child => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.material.color.set(player.color);
      child.material.emissive = new THREE.Color(player.color);
      child.material.emissiveIntensity = 0.22;
      child.castShadow = true;
    });
  }, [player.color]);

  // Update lerp target when server sends new position
  useEffect(() => {
    if (player.pos) target.current.set(...player.pos);
  }, [player.pos]);

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
      <primitive ref={meshRef} object={cloned.current} scale={2}
        position={player.pos || [0, 0, 0]} />

      {/* Name tag — shows the real player name sent from server on join */}
      <Billboard position={labelPos}>
        <Html center>
          <div style={{
            background: "rgba(0,0,0,0.88)",
            color: tagColor,
            padding: "3px 11px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Orbitron', monospace",
            border: `1.5px solid ${tagColor}66`,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            textShadow: `0 0 8px ${tagColor}`,
            letterSpacing: 1,
            minWidth: 50,
            textAlign: "center",
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

/* ═══════════════════════════════════════════════════════════════════════════
   UI — LOBBY SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function LobbyScreen({ moon }) {
  const [name,     setName]     = useState("");
  const [color,    setColor]    = useState(SUIT_COLORS[0]);
  const [roomId,   setRoomId]   = useState("");
  const [newRoom,  setNewRoom]  = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  // Refresh rooms when server connects
  useEffect(() => { if (moon.connected) moon.listRooms(); }, [moon.connected]);

  // Detect join result from message stream
  useEffect(() => {
    const last = moon.messages[moon.messages.length - 1];
    if (!last) return;
    if (last.text?.startsWith("Join failed:")) {
      setError(last.text.replace("Join failed: ", ""));
      setBusy(false);
    }
    if (last.text?.startsWith("Entered")) setBusy(false);
  }, [moon.messages]);

  const doJoin = id => {
    const n = name.trim();
    if (!n) { setError("Enter your callsign first"); return; }
    if (!id) { setError("Select or enter a room ID"); return; }
    setError(""); setBusy(true);
    moon.joinRoom(id, n, color, password || undefined);
  };

  const doCreate = () => {
    const n = name.trim();
    if (!n) { setError("Enter your callsign first"); return; }
    setError("");
    moon.createRoom(newRoom.trim() || "Lunar Base");
    setNewRoom("");
    setTimeout(() => moon.listRooms(), 600);
  };

  // Shared styles
  const inp = (extra = {}) => ({
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(200,210,255,0.18)",
    borderRadius: 7, padding: "9px 13px",
    color: "#c0cce8", fontSize: 12, outline: "none",
    fontFamily: "'Orbitron', monospace",
    width: "100%", boxSizing: "border-box",
    ...extra,
  });

  const btn = (accent = "#ffd700", disabled = false) => ({
    background: `${accent}16`,
    border: `1px solid ${accent}${disabled ? "33" : "55"}`,
    borderRadius: 7, padding: "9px 18px",
    color: disabled ? `${accent}55` : accent,
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Orbitron', monospace", whiteSpace: "nowrap",
    transition: "all 0.15s",
  });

  const notReady = !moon.connected || busy;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(3,3,8,0.97)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500, fontFamily: "'Orbitron', monospace",
    }}>
      <div style={{
        width: 460, maxHeight: "90vh", overflowY: "auto",
        background: "rgba(8,8,22,0.98)",
        border: "1px solid rgba(200,210,255,0.11)",
        borderRadius: 18, padding: 34,
        display: "flex", flexDirection: "column", gap: 20,
        boxShadow: "0 0 90px rgba(80,120,255,0.09)",
      }}>
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38 }}>🌑</div>
          <div style={{
            color: "#c0cce8", fontSize: 22, fontWeight: 900,
            letterSpacing: 5, marginTop: 6,
          }}>MOON METAVERSE</div>
          <div style={{
            color: "rgba(200,210,255,0.25)", fontSize: 8,
            letterSpacing: 4, marginTop: 6,
          }}>LUNAR COLONY · REAL-TIME MULTIPLAYER</div>
        </div>

        {/* Connection status */}
        <div style={{
          textAlign: "center", fontSize: 9, letterSpacing: 3,
          color: moon.connected ? "#39ff14" : "#ff7744",
        }}>
          {moon.connected ? "● SERVER ONLINE" : "● CONNECTING TO SERVER…"}
        </div>

        {/* Callsign */}
        <div>
          <div style={{
            color: "rgba(200,210,255,0.4)", fontSize: 8,
            letterSpacing: 3, marginBottom: 7,
          }}>CALLSIGN *</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && roomId && doJoin(roomId)}
            style={inp()}
            maxLength={20}
            placeholder="Enter your name"
            autoFocus
          />
        </div>

        {/* Suit colour */}
        <div>
          <div style={{
            color: "rgba(200,210,255,0.4)", fontSize: 8,
            letterSpacing: 3, marginBottom: 9,
          }}>SUIT COLOR</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {SUIT_COLORS.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 30, height: 30, borderRadius: "50%", background: c,
                  cursor: "pointer",
                  border: color === c ? "3px solid #fff" : "3px solid transparent",
                  boxShadow: color === c ? `0 0 14px ${c}` : "none",
                  transition: "all 0.18s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Active rooms */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 9,
          }}>
            <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3 }}>
              ACTIVE ROOMS
            </div>
            <button
              onClick={moon.listRooms}
              style={{ ...btn("#00cfff"), padding: "4px 11px", fontSize: 8 }}
            >REFRESH</button>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            maxHeight: 180, overflowY: "auto",
          }}>
            {moon.rooms.length === 0 ? (
              <div style={{
                color: "rgba(200,210,255,0.2)", fontSize: 10,
                padding: "12px 0", textAlign: "center",
              }}>
                No rooms yet — create one below
              </div>
            ) : moon.rooms.map(r => (
              <div key={r.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,0.025)",
                borderRadius: 8, padding: "9px 13px",
                border: "1px solid rgba(200,210,255,0.07)",
              }}>
                <div>
                  <div style={{ color: "#c0cce8", fontSize: 11 }}>{r.name}</div>
                  <div style={{
                    color: "rgba(200,210,255,0.28)", fontSize: 8, marginTop: 2,
                  }}>
                    [{r.id}] &nbsp; {r.playerCount}/{r.maxPlayers} players
                    {r.hasPassword ? " 🔒" : ""}
                  </div>
                </div>
                <button
                  onClick={() => doJoin(r.id)}
                  disabled={notReady}
                  style={btn("#ffd700", notReady)}
                >JOIN</button>
              </div>
            ))}
          </div>
        </div>

        {/* Direct join by ID */}
        <div>
          <div style={{
            color: "rgba(200,210,255,0.4)", fontSize: 8,
            letterSpacing: 3, marginBottom: 7,
          }}>JOIN BY ROOM ID</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              style={inp({ flex: 1 })}
              placeholder="ROOM ID"
              maxLength={8}
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              style={inp({ flex: 1 })}
              placeholder="Password"
            />
            <button
              onClick={() => doJoin(roomId)}
              disabled={notReady || !roomId}
              style={btn("#00cfff", notReady || !roomId)}
            >JOIN</button>
          </div>
        </div>

        {/* Create room */}
        <div>
          <div style={{
            color: "rgba(200,210,255,0.4)", fontSize: 8,
            letterSpacing: 3, marginBottom: 7,
          }}>CREATE NEW ROOM</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newRoom}
              onChange={e => setNewRoom(e.target.value)}
              style={inp({ flex: 1 })}
              placeholder="Room name (optional)"
            />
            <button
              onClick={doCreate}
              disabled={notReady}
              style={btn("#39ff14", notReady)}
            >CREATE</button>
          </div>
        </div>

        {/* Error / loading */}
        {error && (
          <div style={{
            color: "#ff5555", fontSize: 10,
            textAlign: "center", letterSpacing: 1,
          }}>{error}</div>
        )}
        {busy && (
          <div style={{
            color: "#ffd700", fontSize: 9,
            textAlign: "center", letterSpacing: 2,
          }}>ENTERING COLONY…</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI — MINIMAP
═══════════════════════════════════════════════════════════════════════════ */
function Minimap({ playerPos, remotePlayers, playerColor }) {
  const S = 178, W = 62;
  const toMap = (x, z) => ({
    x: ((x + W) / (W * 2)) * S,
    y: ((z + W) / (W * 2)) * S,
  });

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      width: S, height: S,
      background: "rgba(6,6,16,0.93)",
      border: "1.5px solid rgba(200,200,255,0.13)",
      borderRadius: 14, overflow: "hidden", zIndex: 100,
      boxShadow: "0 0 28px rgba(100,120,255,0.1)",
    }}>
      <svg width={S} height={S}>
        {/* Zone rings */}
        {ZONES.map((z, i) => {
          const c = toMap(z.pos[0], z.pos[2]);
          return (
            <circle key={i} cx={c.x} cy={c.y}
              r={(z.r / W) * S * 0.5}
              fill={z.color} fillOpacity={0.07}
              stroke={z.color} strokeOpacity={0.3} strokeWidth={1} />
          );
        })}
        {/* Remote players — real dots with their suit color */}
        {Object.values(remotePlayers).map(p => {
          const rp = p.pos || [0, 0, 0];
          const c  = toMap(rp[0], rp[2]);
          return (
            <circle key={p.id} cx={c.x} cy={c.y}
              r={4} fill={p.color} opacity={0.85} />
          );
        })}
        {/* Local player */}
        {playerPos && (() => {
          const c = toMap(playerPos[0], playerPos[2]);
          return (<>
            <circle cx={c.x} cy={c.y} r={6} fill={playerColor} />
            <circle cx={c.x} cy={c.y} r={10} fill="none"
              stroke={playerColor} strokeWidth={1.2} opacity={0.4} />
            <circle cx={c.x} cy={c.y} r={14} fill="none"
              stroke={playerColor} strokeWidth={0.5} opacity={0.18} />
          </>);
        })()}
      </svg>
      <div style={{
        position: "absolute", top: 5, left: 0, right: 0,
        textAlign: "center", color: "rgba(200,210,255,0.38)",
        fontSize: 8, fontFamily: "'Orbitron', monospace", letterSpacing: 2,
      }}>LUNAR MAP</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI — WORLD CHAT
═══════════════════════════════════════════════════════════════════════════ */
function Chat({ messages, onSend, disabled }) {
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, left: 20,
      width: 300, zIndex: 100,
      fontFamily: "'Orbitron', monospace",
    }}>
      {/* Header */}
      <div style={{
        background: "rgba(6,6,18,0.9)",
        border: "1px solid rgba(200,210,255,0.1)",
        borderRadius: "10px 10px 0 0",
        padding: "5px 13px",
        color: "rgba(200,210,255,0.35)", fontSize: 8, letterSpacing: 3,
      }}>◈ LUNAR COMMS</div>

      {/* Message list */}
      <div style={{
        background: "rgba(4,4,14,0.93)",
        border: "1px solid rgba(200,210,255,0.07)",
        borderTop: "none", height: 145, overflowY: "auto",
        padding: "7px 11px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ fontSize: 11, lineHeight: 1.45 }}>
            <span style={{
              color: m.color, fontWeight: 700,
              opacity: m.system ? 0.7 : 1,
              textShadow: m.system ? "none" : `0 0 5px ${m.color}`,
            }}>
              {m.name}:{" "}
            </span>
            <span style={{ color: m.system ? "#6677aa" : "#c0cce8" }}>
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        border: "1px solid rgba(200,210,255,0.07)",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        overflow: "hidden",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={disabled}
          placeholder={disabled ? "Join a room to chat…" : "Broadcast to colony…"}
          style={{
            flex: 1, background: "#05050f", color: "#c0cce8",
            border: "none", outline: "none",
            padding: "7px 11px", fontSize: 10,
            fontFamily: "'Orbitron', monospace",
            opacity: disabled ? 0.4 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={disabled}
          style={{
            background: "rgba(200,210,255,0.05)",
            color: "#c0cce8", border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "0 14px", fontSize: 14,
            borderLeft: "1px solid rgba(200,210,255,0.07)",
            opacity: disabled ? 0.4 : 1,
          }}
        >⇒</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI — HUD
═══════════════════════════════════════════════════════════════════════════ */
function HUD({ name, color, zone, colonistCount, playerPos, oxygen, ping, connected }) {
  const coords   = playerPos ? `${playerPos[0].toFixed(1)}, ${playerPos[2].toFixed(1)}` : "—";
  const alt      = playerPos ? (playerPos[1] * 10).toFixed(1) : "0.0";
  const oxy      = Math.max(0, Math.min(100, oxygen));
  const oxyColor = oxy > 50 ? "#39ff14" : oxy > 25 ? "#ffaa00" : "#ff4444";

  return (<>
    {/* Top bar */}
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 9, zIndex: 100,
      fontFamily: "'Orbitron', monospace", alignItems: "center",
    }}>
      <div style={{
        background: "rgba(4,4,14,0.92)", borderRadius: 8,
        border: `1px solid ${color}44`,
        padding: "6px 15px", color, fontSize: 12, fontWeight: 700,
        textShadow: `0 0 12px ${color}`,
      }}>▶ {name || "COMMANDER"}</div>

      <div style={{
        background: "rgba(4,4,14,0.92)", borderRadius: 8,
        border: "1px solid rgba(200,210,255,0.11)",
        padding: "6px 14px", color: "#c0cce8", fontSize: 10, letterSpacing: 1,
      }}>{zone}</div>

      <div style={{
        background: "rgba(4,4,14,0.92)", borderRadius: 8,
        border: "1px solid rgba(80,130,255,0.22)",
        padding: "6px 14px", color: "#8aafff", fontSize: 10,
      }}>👾 {colonistCount}</div>

      <div style={{
        background: "rgba(4,4,14,0.92)", borderRadius: 8,
        border: `1px solid ${connected ? "#39ff1430" : "#ff444430"}`,
        padding: "6px 14px", fontSize: 10,
        color: connected ? "#39ff14" : "#ff4444",
      }}>{connected ? `● ${ping}ms` : "● OFFLINE"}</div>
    </div>

    {/* Bottom status bar */}
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 9, zIndex: 100,
      fontFamily: "'Orbitron', monospace", alignItems: "center",
    }}>
      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border: "1px solid rgba(200,210,255,0.07)",
        padding: "4px 13px", color: "rgba(200,210,255,0.35)",
        fontSize: 8, letterSpacing: 2,
      }}>📍 {coords} · ALT {alt}m</div>

      {/* Oxygen */}
      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border: `1px solid ${oxyColor}44`,
        padding: "4px 13px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ color: oxyColor, fontSize: 8, letterSpacing: 2 }}>O₂</span>
        <div style={{
          width: 72, height: 5,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 3, overflow: "hidden",
        }}>
          <div style={{
            width: `${oxy}%`, height: "100%", background: oxyColor,
            borderRadius: 3, transition: "width 0.4s",
            boxShadow: `0 0 7px ${oxyColor}`,
          }} />
        </div>
        <span style={{ color: oxyColor, fontSize: 9 }}>{Math.round(oxy)}%</span>
      </div>

      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border: "1px solid rgba(200,210,255,0.07)",
        padding: "4px 13px", color: "rgba(200,210,255,0.28)",
        fontSize: 8, letterSpacing: 2,
      }}>SPACE · JUMP</div>
    </div>
  </>);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI — SIDEBAR (Controls + Emotes + Leave)
═══════════════════════════════════════════════════════════════════════════ */
function Sidebar({ onEmote, disabled, onLeave }) {
  const emotes = [
    ["wave",   "👋", "Wave"],
    ["jump",   "🦘", "Jump"],
    ["dance",  "💃", "Dance"],
    ["salute", "🫡", "Salute"],
    ["point",  "👉", "Point"],
  ];

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 100,
      background: "rgba(4,4,14,0.9)",
      border: "1px solid rgba(200,210,255,0.09)",
      borderRadius: 10, padding: "13px 16px",
      fontFamily: "'Orbitron', monospace",
      display: "flex", flexDirection: "column", gap: 11,
    }}>
      <div style={{ color: "#c0cce8", fontSize: 8, fontWeight: 700, letterSpacing: 2 }}>
        CONTROLS
      </div>
      <div style={{
        color: "rgba(200,210,255,0.38)", fontSize: 8,
        lineHeight: 2.0, letterSpacing: 1,
      }}>
        <div>W A S D  ·  MOVE</div>
        <div>SPACE    ·  JUMP</div>
        <div>ENTER    ·  CHAT</div>
      </div>

      <div style={{ color: "#c0cce8", fontSize: 8, fontWeight: 700, letterSpacing: 2 }}>
        EMOTES
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 118 }}>
        {emotes.map(([id, emoji, label]) => (
          <button
            key={id}
            onClick={() => onEmote(id)}
            disabled={disabled}
            title={label}
            style={{
              background: "rgba(200,210,255,0.05)",
              border: "1px solid rgba(200,210,255,0.1)",
              borderRadius: 6, padding: "5px 7px",
              fontSize: 18, cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.3 : 1, transition: "opacity 0.15s",
            }}
          >{emoji}</button>
        ))}
      </div>

      <button
        onClick={onLeave}
        style={{
          background: "rgba(255,80,80,0.08)",
          border: "1px solid rgba(255,80,80,0.28)",
          borderRadius: 6, padding: "6px 0",
          color: "#ff9999", fontSize: 8, letterSpacing: 2,
          cursor: "pointer", fontFamily: "'Orbitron', monospace",
        }}
      >LEAVE COLONY</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI — METEOR ALERT OVERLAY
═══════════════════════════════════════════════════════════════════════════ */
function MeteorAlert({ active, message }) {
  if (!active) return null;
  return (
    <div style={{
      position: "fixed", top: "38%", left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 200, textAlign: "center", pointerEvents: "none",
    }}>
      <style>{`
        @keyframes mshake {
          0%,100% { transform: translate(-1px,-1px); }
          50%      { transform: translate( 1px, 1px); }
        }
        @keyframes mblink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.35; }
        }
      `}</style>
      <div style={{ fontSize: 52, animation: "mshake 0.3s infinite" }}>☄️</div>
      <div style={{
        color: "#ff3333", fontSize: 13, fontWeight: 700,
        fontFamily: "'Orbitron', monospace",
        textShadow: "0 0 25px #ff3333",
        letterSpacing: 2, marginTop: 10,
        animation: "mblink 0.5s infinite",
      }}>{message}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK — OXYGEN
   Drains slowly on the surface, refills inside Apollo Base.
═══════════════════════════════════════════════════════════════════════════ */
function useOxygen(playerPos, sendOxygen, active) {
  const [oxy, setOxy] = useState(100);

  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      const atBase = playerPos
        ? Math.sqrt(playerPos[0] ** 2 + playerPos[2] ** 2) < 10
        : false;
      setOxy(prev => {
        const next = atBase
          ? Math.min(100, prev + 2.5)
          : Math.max(0, prev - 0.35 + Math.random() * 0.25);
        sendOxygen(next);
        return next;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [playerPos, sendOxygen, active]);

  return oxy;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function MoonMetaverse() {
  const moon = useMoonSocket(SERVER_URL);

  const [playerPos, setPlayerPos] = useState(null);
  const inGame = !!moon.myPlayer;

  const playerColor = moon.myPlayer?.color || SUIT_COLORS[0];
  const playerName  = moon.myPlayer?.name  || "COMMANDER";

  const oxygen    = useOxygen(playerPos, moon.sendOxygen, inGame);
  const colonists = Object.keys(moon.players).length + (inGame ? 1 : 0);

  const handleLeave = useCallback(() => moon.leaveRoom(), [moon.leaveRoom]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#030308", overflow: "hidden" }}>
      {/* Orbitron font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap"
        rel="stylesheet"
      />

      {/* Lobby gate — covers world until player has joined a room */}
      {!inGame && <LobbyScreen moon={moon} />}

      {/* 3D world — always rendered behind lobby so it loads in background */}
      <Canvas
        shadows
        camera={{ position: [0, 5, 12], fov: 65 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#050510", 75, 145]} />
        <Stars radius={220} depth={90} count={7500} factor={5}
          saturation={0.5} fade speed={0.2} />

        {/* Lighting */}
        <ambientLight intensity={0.17} color="#b8c8e8" />
        <directionalLight
          position={[100, 60, -80]} intensity={2.2} color="#fffbe8"
          castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-65} shadow-camera-right={65}
          shadow-camera-top={65}  shadow-camera-bottom={-65}
        />
        <pointLight position={[-55, 42, -80]} intensity={0.65}
          color="#4488ff" distance={200} />

        <MoonSurface />
        <LunarStructures />
        <EarthInSky />
        {ZONES.map((z, i) => <ZoneLabel key={i} zone={z} />)}

        {/* Local player — rendered only when in game */}
        {inGame && (
          <LocalAvatar
            color={playerColor}
            name={playerName}
            sendMove={moon.sendMove}
            onPosChange={setPlayerPos}
          />
        )}

        {/* Remote players — all real humans, no bots
            Name tag appears the moment server confirms join */}
     
   {Object.values(moon.players)
  .filter(p => p.id !== moon.myPlayer?.id)
  .map(p => (
    <RemoteAvatar key={p.id} player={p} />
))}
      </Canvas>

      {/* HUD + sidebar — only while in game */}
      {inGame && (<>
        <HUD
          name={playerName}
          color={playerColor}
          zone={moon.zone}
          colonistCount={colonists}
          playerPos={playerPos}
          oxygen={oxygen}
          ping={moon.ping}
          connected={moon.connected}
        />
        <Sidebar
          onEmote={moon.sendEmote}
          disabled={!moon.connected}
          onLeave={handleLeave}
        />
        <MeteorAlert active={moon.meteorActive} message={moon.meteorMsg} />
      </>)}

      {/* Chat + minimap always visible */}
      <Chat
        messages={moon.messages}
        onSend={moon.sendChat}
        disabled={!inGame || !moon.connected}
      />
      <Minimap
        playerPos={playerPos}
        remotePlayers={moon.players}
        playerColor={playerColor}
      />
    </div>
  );
}
