/**
 * ui/HUD.jsx
 * ──────────
 * In-game heads-up display:
 *   Top bar  — callsign, zone, colonist count, ping / online badge
 *   Bottom bar — coordinates, altitude, oxygen bar, jump hint
 */

export default function HUD({ name, color, zone, colonistCount,
                              playerPos, oxygen, ping, connected }) {
  const coords   = playerPos
    ? `${playerPos[0].toFixed(1)}, ${playerPos[2].toFixed(1)}`
    : "—";
  const alt      = playerPos ? (playerPos[1] * 10).toFixed(1) : "0.0";
  const oxy      = Math.max(0, Math.min(100, oxygen));
  const oxyColor = oxy > 50 ? "#39ff14" : oxy > 25 ? "#ffaa00" : "#ff4444";

  const pill = (children, borderColor = "rgba(200,210,255,0.11)", extra = {}) => ({
    background:   "rgba(4,4,14,0.92)",
    borderRadius:  8,
    border:       `1px solid ${borderColor}`,
    padding:      "6px 15px",
    fontSize:      10,
    fontFamily:   "'Orbitron', monospace",
    ...extra,
  });

  return (<>
    {/* ── Top bar ── */}
    <div style={{
      position:  "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      display:   "flex", gap: 9, zIndex: 100, alignItems: "center",
    }}>
      {/* Callsign */}
      <div style={pill(`${color}44`, {
        color, fontWeight: 700, fontSize: 12, textShadow: `0 0 12px ${color}`,
      })}>▶ {name || "COMMANDER"}</div>

      {/* Zone */}
      <div style={pill(undefined, { color: "#c0cce8", letterSpacing: 1 })}>
        {zone}
      </div>

      {/* Colonist count */}
      <div style={pill("rgba(80,130,255,0.22)", { color: "#8aafff" })}>
        👾 {colonistCount}
      </div>

      {/* Ping / connection */}
      <div style={pill(
        connected ? "#39ff1430" : "#ff444430",
        { color: connected ? "#39ff14" : "#ff4444" },
      )}>
        {connected ? `● ${ping}ms` : "● OFFLINE"}
      </div>
    </div>

    {/* ── Bottom bar ── */}
    <div style={{
      position:  "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      display:   "flex", gap: 9, zIndex: 100, alignItems: "center",
      fontFamily: "'Orbitron', monospace",
    }}>
      {/* Coordinates */}
      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border:     "1px solid rgba(200,210,255,0.07)",
        padding:    "4px 13px", color: "rgba(200,210,255,0.35)",
        fontSize:    8, letterSpacing: 2,
      }}>📍 {coords} · ALT {alt}m</div>

      {/* Oxygen bar */}
      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border:     `1px solid ${oxyColor}44`,
        padding:    "4px 13px",
        display:    "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ color: oxyColor, fontSize: 8, letterSpacing: 2 }}>O₂</span>
        <div style={{
          width: 72, height: 5,
          background:   "rgba(255,255,255,0.08)",
          borderRadius:  3, overflow: "hidden",
        }}>
          <div style={{
            width:        `${oxy}%`,
            height:       "100%",
            background:    oxyColor,
            borderRadius:  3,
            transition:   "width 0.4s",
            boxShadow:    `0 0 7px ${oxyColor}`,
          }} />
        </div>
        <span style={{ color: oxyColor, fontSize: 9 }}>{Math.round(oxy)}%</span>
      </div>

      {/* Jump hint */}
      <div style={{
        background: "rgba(4,4,14,0.85)", borderRadius: 8,
        border:     "1px solid rgba(200,210,255,0.07)",
        padding:    "4px 13px", color: "rgba(200,210,255,0.28)",
        fontSize:    8, letterSpacing: 2,
      }}>SPACE · JUMP</div>
    </div>
  </>);
}
