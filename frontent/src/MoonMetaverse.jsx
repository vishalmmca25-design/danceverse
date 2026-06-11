/**
 * MoonMetaverse.jsx — Root Component
 * ====================================
 * Assembles all pieces. Contains no logic itself —
 * everything lives in the relevant hook or component file.
 *
 * File structure:
 *   constants/index.js          — config, colours, zones, KEYS
 *   hooks/useMoonSocket.js      — all socket / multiplayer state
 *   hooks/useOxygen.js          — oxygen drain / refill
 *   3d/MoonSurface.jsx          — regolith, craters, rocks
 *   3d/EarthInSky.jsx           — animated rotating Earth
 *   3d/LunarStructures.jsx      — Apollo base, mine, comm array, rover…
 *   3d/ZoneLabel.jsx            — billboard zone name above each zone
 *   3d/LocalAvatar.jsx          — local player: physics, camera, name tag
 *   3d/RemoteAvatar.jsx         — remote player: lerp, real name tag
 *   ui/LobbyScreen.jsx          — pre-game: name, colour, room list
 *   ui/HUD.jsx                  — top bar + bottom status bar
 *   ui/Chat.jsx                 — world chat panel
 *   ui/Minimap.jsx              — real-time player map
 *   ui/Sidebar.jsx              — controls hint, emotes, leave
 *   ui/MeteorAlert.jsx          — fullscreen meteor event overlay
 */

import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";

import { SERVER_URL, SUIT_COLORS, ZONES } from "./constants";
import useMoonSocket from "./hooks/useMoonSocket";
import useOxygen     from "./hooks/useOxygen";

import MoonSurface      from "./3d/MoonSurface";
import EarthInSky       from "./3d/EarthInSky";
import LunarStructures  from "./3d/LunarStructures";
import ZoneLabel        from "./3d/ZoneLabel";
import LocalAvatar      from "./3d/LocalAvatar";
import RemoteAvatar     from "./3d/RemoteAvatar";

import LobbyScreen  from "./ui/LobbyScreen";
import HUD          from "./ui/HUD";
import Chat         from "./ui/Chat";
import Minimap      from "./ui/Minimap";
import Sidebar      from "./ui/Sidebar";
import MeteorAlert  from "./ui/MeteorAlert";

export default function MoonMetaverse() {
  const moon = useMoonSocket(SERVER_URL);

  const [playerPos, setPlayerPos] = useState(null);
  const inGame = !!moon.myPlayer;

  const playerColor = moon.myPlayer?.color || SUIT_COLORS[0];
  const playerName  = moon.myPlayer?.name  || "COMMANDER";
  const colonists   = Object.keys(moon.players).length + (inGame ? 1 : 0);

  const oxygen = useOxygen(playerPos, moon.sendOxygen, inGame);

  const handleLeave = useCallback(() => moon.leaveRoom(), [moon.leaveRoom]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#030308", overflow: "hidden" }}>
      {/* Orbitron font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap"
        rel="stylesheet"
      />

      {/* Lobby gate — covers world until player joins a room */}
      {!inGame && <LobbyScreen moon={moon} />}

      {/* ── 3D World ── */}
      <Canvas
        shadows
        camera={{ position: [0, 5, 12], fov: 65 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#030308"]} />
        <fog   attach="fog"        args={["#050510", 75, 145]} />

        <Stars radius={220} depth={90} count={7500}
          factor={5} saturation={0.5} fade speed={0.2} />

        {/* Lighting */}
        <ambientLight intensity={0.17} color="#b8c8e8" />
        <directionalLight
          position={[100, 60, -80]} intensity={2.2} color="#fffbe8"
          castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-65} shadow-camera-right={65}
          shadow-camera-top={65}   shadow-camera-bottom={-65}
        />
        <pointLight position={[-55, 42, -80]} intensity={0.65}
          color="#4488ff" distance={200} />

        {/* World geometry */}
        <MoonSurface />
        <LunarStructures />
        <EarthInSky />
        {ZONES.map((z, i) => <ZoneLabel key={i} zone={z} />)}

        {/* Local player — only when in game */}
        {inGame && (
          <LocalAvatar
            color={playerColor}
            name={playerName}
            sendMove={moon.sendMove}
            onPosChange={setPlayerPos}
          />
        )}

        {/* Remote players — real humans, no bots.
            Name tag appears the moment server confirms join. */}
     // AFTER — exclude own player by ID
{Object.values(moon.players)
  .filter(p => p.id !== moon.myPlayer?.id)   // ← not update local player position through server
  .map(p => (
    <RemoteAvatar key={p.id} player={p} />
  ))
}
      </Canvas>

      {/* ── HUD + in-game overlays ── */}
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

      {/* Chat + minimap always visible (even on lobby screen) */}
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
