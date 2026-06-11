/**
 * hooks/useMoonSocket.js
 * ──────────────────────
 * Connects to the FastAPI + Socket.IO backend.
 * Manages all multiplayer state and exposes clean action callbacks.
 *
 * Returns:
 *   connected, ping, myPlayer, players, messages,
 *   zone, rooms, meteorActive, meteorMsg,
 *   listRooms, createRoom, joinRoom, leaveRoom,
 *   sendMove, sendChat, sendOxygen, sendEmote
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

export default function useMoonSocket(url) {
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

  // ── Helper: push a system message into chat ────────────────────────────────
  const pushMsg = useCallback((text, color = "#556677", name = "SYSTEM") => {
    const msg = {
      id: Math.random().toString(36).slice(2),
      name, color, text,
      timestamp: Date.now(),
      system: true,
    };
    setMessages(p => [...p.slice(-100), msg]);
  }, []);

  // ── Socket lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(url, { transports: ["websocket"], reconnectionDelay: 1500 });
    socketRef.current = s;

    // Connection
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

    // Latency measurement
    const pingIv = setInterval(() => {
      const t = Date.now();
      s.emit("ping_client", t);
    }, 3000);
    s.on("pong_server", t => setPing(Date.now() - t));

    // ── Room events ──────────────────────────────────────────────────────────
    s.on("rooms_list",   ({ rooms: r }) => setRooms(r));
    s.on("room_created", ({ room })     => setRooms(p => [...p, room]));
    s.on("room_closed",  ({ message })  => pushMsg(message, "#ff4444"));

    // ── Join / leave ─────────────────────────────────────────────────────────
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

    // ── Player lifecycle — name shown in chat on join ────────────────────────
    s.on("player_joined", p => {
      setPlayers(prev => ({ ...prev, [p.id]: p }));
      pushMsg(`${p.name} has landed on the Moon`, p.color);
    });
    s.on("player_left", ({ id, name }) => {
      setPlayers(prev => { const n = { ...prev }; delete n[id]; return n; });
      pushMsg(`${name} left the colony`, "#556677");
    });

    // ── Real-time position deltas ────────────────────────────────────────────
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

    // ── Own zone change ──────────────────────────────────────────────────────
    s.on("zone_changed", ({ zone: z }) => {
      setZone(z);
      pushMsg(`Entered: ${z}`, "#ffd700");
    });

    // ── Oxygen warning ───────────────────────────────────────────────────────
    s.on("player_low_oxygen", ({ name, oxygen }) => {
      pushMsg(`LOW O2 WARNING — ${name} at ${Math.round(oxygen)}%`, "#ff4444");
    });

    // ── Emotes ───────────────────────────────────────────────────────────────
    s.on("player_emote", ({ name, emote }) => {
      const labels = {
        wave: "waves", jump: "jumps", dance: "dances",
        salute: "salutes", point: "points",
      };
      pushMsg(`${name} ${labels[emote] || emote}`, "#aaaaee");
    });

    // ── Chat ─────────────────────────────────────────────────────────────────
    s.on("chat_message", msg => {
      setMessages(p => [...p.slice(-100), msg]);
    });

    // ── World snapshot — full-state fallback sync every 2s ───────────────────
    s.on("world_snapshot", ({ players: snap }) => {
      setPlayers(prev => {
        const next = { ...prev };
        snap.forEach(p => { next[p.id] = { ...next[p.id], ...p }; });
        return next;
      });
    });

    // ── Meteor shower events ─────────────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────────
  const listRooms  = useCallback(() =>
    socketRef.current?.emit("list_rooms_ws"), []);

  const createRoom = useCallback((name, pw) =>
    socketRef.current?.emit("create_room_ws", { roomName: name, password: pw }), []);

  const joinRoom   = useCallback((roomId, playerName, color, pw) =>
    socketRef.current?.emit("join_room", { roomId, playerName, color, password: pw }), []);

  const leaveRoom  = useCallback(() =>
    socketRef.current?.emit("leave_room_ws"), []);

  // volatile = fire-and-forget, no ACK — ideal for high-frequency position updates
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
