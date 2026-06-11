/**
 * 3d/ZoneLabel.jsx
 * ────────────────
 * Floating billboard label above each lunar zone.
 * Always faces the camera (Billboard from drei).
 */

import { Billboard, Html } from "@react-three/drei";

export default function ZoneLabel({ zone }) {
  return (
    <Billboard position={[zone.pos[0], 7.5, zone.pos[2]]}>
      <Html center>
        <div style={{
          background:    "rgba(0,0,0,0.78)",
          color:         zone.color,
          padding:       "3px 12px",
          borderRadius:  20,
          fontSize:      11,
          fontWeight:    700,
          fontFamily:    "'Orbitron', monospace",
          whiteSpace:    "nowrap",
          pointerEvents: "none",
          border:        `1px solid ${zone.color}55`,
          textShadow:    `0 0 10px ${zone.color}`,
          letterSpacing: 1,
        }}>
          {zone.icon} {zone.name}
        </div>
      </Html>
    </Billboard>
  );
}
