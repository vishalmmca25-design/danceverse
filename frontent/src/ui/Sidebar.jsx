/**
 * ui/Sidebar.jsx
 * ──────────────
 * Fixed panel on the top-right:
 *   - Controls reference (WASD, SPACE, ENTER)
 *   - Emote buttons (wave, jump, dance, salute, point)
 *   - Leave Colony button
 */

const EMOTES = [
  ["wave",   "👋", "Wave"],
  ["jump",   "🦘", "Jump"],
  ["dance",  "💃", "Dance"],
  ["salute", "🫡", "Salute"],
  ["point",  "👉", "Point"],
];

export default function Sidebar({ onEmote, disabled, onLeave }) {
  return (
    <div style={{
      position:      "fixed", top: 16, right: 16, zIndex: 100,
      background:    "rgba(4,4,14,0.9)",
      border:        "1px solid rgba(200,210,255,0.09)",
      borderRadius:   10, padding: "13px 16px",
      fontFamily:    "'Orbitron', monospace",
      display:       "flex", flexDirection: "column", gap: 11,
    }}>
      {/* Controls */}
      <div style={{ color: "#c0cce8", fontSize: 8, fontWeight: 700, letterSpacing: 2 }}>
        CONTROLS
      </div>
      <div style={{ color: "rgba(200,210,255,0.38)", fontSize: 8, lineHeight: 2.0, letterSpacing: 1 }}>
        <div>W A S D  ·  MOVE</div>
        <div>SPACE    ·  JUMP</div>
        <div>ENTER    ·  CHAT</div>
      </div>

      {/* Emotes */}
      <div style={{ color: "#c0cce8", fontSize: 8, fontWeight: 700, letterSpacing: 2 }}>
        EMOTES
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 118 }}>
        {EMOTES.map(([id, emoji, label]) => (
          <button
            key={id}
            onClick={() => onEmote(id)}
            disabled={disabled}
            title={label}
            style={{
              background:   "rgba(200,210,255,0.05)",
              border:       "1px solid rgba(200,210,255,0.1)",
              borderRadius:  6, padding: "5px 7px",
              fontSize:     18,
              cursor:       disabled ? "not-allowed" : "pointer",
              opacity:      disabled ? 0.3 : 1,
              transition:   "opacity 0.15s",
            }}
          >{emoji}</button>
        ))}
      </div>

      {/* Leave */}
      <button
        onClick={onLeave}
        style={{
          background:   "rgba(255,80,80,0.08)",
          border:       "1px solid rgba(255,80,80,0.28)",
          borderRadius:  6, padding: "6px 0",
          color:        "#ff9999", fontSize: 8, letterSpacing: 2,
          cursor:       "pointer", fontFamily: "'Orbitron', monospace",
        }}
      >LEAVE COLONY</button>
    </div>
  );
}
