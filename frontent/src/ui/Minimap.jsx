/**
 * ui/Minimap.jsx
 * ──────────────
 * SVG minimap fixed to the bottom-right.
 * Shows zone rings, all remote players as coloured dots,
 * and the local player with a pulsing target circle.
 */
import { ZONES } from "../constants";

export default function Minimap({ playerPos, remotePlayers, playerColor, myPlayerId }) {
  const S = 178;
  const W = 62;

  const toMap = (x, z) => ({
    x: ((x + W) / (W * 2)) * S,
    y: ((z + W) / (W * 2)) * S,
  });

  return (
    <div style={{
      position:     "fixed", bottom: 20, right: 20,
      width:        S, height: S,
      background:   "rgba(6,6,16,0.93)",
      border:       "1.5px solid rgba(200,200,255,0.13)",
      borderRadius:  14, overflow: "hidden", zIndex: 100,
      boxShadow:    "0 0 28px rgba(100,120,255,0.1)",
    }}>
      <svg width={S} height={S}>

        {/* Zone rings */}
        {ZONES.map((z, i) => {
          const c = toMap(z.pos[0], z.pos[2]);
          return (
            <circle key={i}
              cx={c.x} cy={c.y}
              r={(z.r / W) * S * 0.5}
              fill={z.color}   fillOpacity={0.07}
              stroke={z.color} strokeOpacity={0.3}
              strokeWidth={1}
            />
          );
        })}

        {/* Remote players — exclude self */}
        {Object.values(remotePlayers)
          .filter(p => p.id !== myPlayerId)
          .map(p => {
            const rp = p.pos || [0, 0, 0];
            const c  = toMap(rp[0], rp[2]);
            return (
              <circle key={p.id}
                cx={c.x} cy={c.y}
                r={4} fill={p.color} opacity={0.85}
              />
            );
          })}

        {/* Local player — solid dot + rings */}
        {playerPos && (() => {
          const c = toMap(playerPos[0], playerPos[2]);
          return (<>
            <circle cx={c.x} cy={c.y} r={6}  fill={playerColor} />
            <circle cx={c.x} cy={c.y} r={10} fill="none"
              stroke={playerColor} strokeWidth={1.2} opacity={0.4} />
            <circle cx={c.x} cy={c.y} r={14} fill="none"
              stroke={playerColor} strokeWidth={0.5} opacity={0.18} />
          </>);
        })()}

      </svg>

      <div style={{
        position:     "absolute", top: 5, left: 0, right: 0,
        textAlign:    "center",
        color:        "rgba(200,210,255,0.38)",
        fontSize:      8,
        fontFamily:   "'Orbitron', monospace",
        letterSpacing: 2,
      }}>LUNAR MAP</div>
    </div>
  );
}