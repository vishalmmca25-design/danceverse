/**
 * ui/LobbyScreen.jsx
 * ──────────────────
 * Full-screen lobby shown before the player joins a room.
 * - Enter callsign (shown as name tag in-world)
 * - Pick suit colour
 * - Browse active rooms (auto-refreshed on connect)
 * - Join by room ID + optional password
 * - Create a new room
 */

import { useState, useEffect } from "react";
import { SUIT_COLORS } from "../constants";

export default function LobbyScreen({ moon }) {
  const [name,     setName]     = useState("");
  const [color,    setColor]    = useState(SUIT_COLORS[0]);
  const [roomId,   setRoomId]   = useState("");
  const [newRoom,  setNewRoom]  = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  // Refresh room list when connected
  useEffect(() => { if (moon.connected) moon.listRooms(); }, [moon.connected]);

  // Detect join result via message stream
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
    if (!n)  { setError("Enter your callsign first"); return; }
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

  // ── Shared style helpers ──────────────────────────────────────────────────
  const inp = (extra = {}) => ({
    background:  "rgba(255,255,255,0.04)",
    border:      "1px solid rgba(200,210,255,0.18)",
    borderRadius: 7,
    padding:     "9px 13px",
    color:       "#c0cce8",
    fontSize:    12,
    outline:     "none",
    fontFamily:  "'Orbitron', monospace",
    width:       "100%",
    boxSizing:   "border-box",
    ...extra,
  });

  const btn = (accent = "#ffd700", off = false) => ({
    background:   `${accent}16`,
    border:       `1px solid ${accent}${off ? "33" : "55"}`,
    borderRadius:  7,
    padding:      "9px 18px",
    color:         off ? `${accent}55` : accent,
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: 1,
    cursor:        off ? "not-allowed" : "pointer",
    fontFamily:   "'Orbitron', monospace",
    whiteSpace:   "nowrap",
    transition:   "all 0.15s",
  });

  const notReady = !moon.connected || busy;

  return (
    <div style={{
      position:   "fixed", inset: 0,
      background: "rgba(3,3,8,0.97)",
      display:    "flex", alignItems: "center", justifyContent: "center",
      zIndex:     500, fontFamily: "'Orbitron', monospace",
    }}>
      <div style={{
        width:      460,
        maxHeight:  "90vh",
        overflowY:  "auto",
        background: "rgba(8,8,22,0.98)",
        border:     "1px solid rgba(200,210,255,0.11)",
        borderRadius: 18,
        padding:    34,
        display:    "flex", flexDirection: "column", gap: 20,
        boxShadow:  "0 0 90px rgba(80,120,255,0.09)",
      }}>

        {/* ── Title ── */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38 }}>🌑</div>
          <div style={{
            color: "#c0cce8", fontSize: 22, fontWeight: 900, letterSpacing: 5, marginTop: 6,
          }}>MOON METAVERSE</div>
          <div style={{
            color: "rgba(200,210,255,0.25)", fontSize: 8, letterSpacing: 4, marginTop: 6,
          }}>LUNAR COLONY · REAL-TIME MULTIPLAYER</div>
        </div>

        {/* ── Server status ── */}
        <div style={{
          textAlign: "center", fontSize: 9, letterSpacing: 3,
          color: moon.connected ? "#39ff14" : "#ff7744",
        }}>
          {moon.connected ? "● SERVER ONLINE" : "● CONNECTING TO SERVER…"}
        </div>

        {/* ── Callsign ── */}
        <div>
          <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3, marginBottom: 7 }}>
            CALLSIGN *
          </div>
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

        {/* ── Suit colour ── */}
        <div>
          <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3, marginBottom: 9 }}>
            SUIT COLOR
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {SUIT_COLORS.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 30, height: 30, borderRadius: "50%", background: c,
                  cursor: "pointer",
                  border:     color === c ? "3px solid #fff" : "3px solid transparent",
                  boxShadow:  color === c ? `0 0 14px ${c}` : "none",
                  transition: "all 0.18s",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Active rooms ── */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 9,
          }}>
            <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3 }}>
              ACTIVE ROOMS
            </div>
            <button onClick={moon.listRooms}
              style={{ ...btn("#00cfff"), padding: "4px 11px", fontSize: 8 }}>
              REFRESH
            </button>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            maxHeight: 180, overflowY: "auto",
          }}>
            {moon.rooms.length === 0 ? (
              <div style={{
                color: "rgba(200,210,255,0.2)", fontSize: 10,
                padding: "12px 0", textAlign: "center",
              }}>No rooms yet — create one below</div>
            ) : moon.rooms.map(r => (
              <div key={r.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background:   "rgba(255,255,255,0.025)",
                borderRadius:  8, padding: "9px 13px",
                border:       "1px solid rgba(200,210,255,0.07)",
              }}>
                <div>
                  <div style={{ color: "#c0cce8", fontSize: 11 }}>{r.name}</div>
                  <div style={{ color: "rgba(200,210,255,0.28)", fontSize: 8, marginTop: 2 }}>
                    [{r.id}] &nbsp; {r.playerCount}/{r.maxPlayers} players
                    {r.hasPassword ? " 🔒" : ""}
                  </div>
                </div>
                <button onClick={() => doJoin(r.id)} disabled={notReady}
                  style={btn("#ffd700", notReady)}>JOIN</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Join by ID ── */}
        <div>
          <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3, marginBottom: 7 }}>
            JOIN BY ROOM ID
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())}
              style={inp({ flex: 1 })} placeholder="ROOM ID" maxLength={8} />
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" style={inp({ flex: 1 })} placeholder="Password" />
            <button onClick={() => doJoin(roomId)} disabled={notReady || !roomId}
              style={btn("#00cfff", notReady || !roomId)}>JOIN</button>
          </div>
        </div>

        {/* ── Create room ── */}
        <div>
          <div style={{ color: "rgba(200,210,255,0.4)", fontSize: 8, letterSpacing: 3, marginBottom: 7 }}>
            CREATE NEW ROOM
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newRoom} onChange={e => setNewRoom(e.target.value)}
              style={inp({ flex: 1 })} placeholder="Room name (optional)" />
            <button onClick={doCreate} disabled={notReady}
              style={btn("#39ff14", notReady)}>CREATE</button>
          </div>
        </div>

        {/* ── Error / loading ── */}
        {error && (
          <div style={{ color: "#ff5555", fontSize: 10, textAlign: "center", letterSpacing: 1 }}>
            {error}
          </div>
        )}
        {busy && (
          <div style={{ color: "#ffd700", fontSize: 9, textAlign: "center", letterSpacing: 2 }}>
            ENTERING COLONY…
          </div>
        )}
      </div>
    </div>
  );
}
