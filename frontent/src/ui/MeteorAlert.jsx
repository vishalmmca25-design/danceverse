/**
 * ui/MeteorAlert.jsx
 * ──────────────────
 * Full-screen overlay shown when the server fires a meteor_shower_start event.
 * Shaking comet emoji + blinking warning text. Pointer-events: none.
 */

export default function MeteorAlert({ active, message }) {
  if (!active) return null;

  return (
    <div style={{
      position:      "fixed",
      top:           "38%", left: "50%",
      transform:     "translate(-50%, -50%)",
      zIndex:        200,
      textAlign:     "center",
      pointerEvents: "none",
    }}>
      <style>{`
        @keyframes mshake {
          0%,100% { transform: translate(-1px,-1px); }
          50%     { transform: translate( 1px, 1px); }
        }
        @keyframes mblink {
          0%,100% { opacity: 1;    }
          50%     { opacity: 0.35; }
        }
      `}</style>

      <div style={{ fontSize: 52, animation: "mshake 0.3s infinite" }}>☄️</div>

      <div style={{
        color:         "#ff3333",
        fontSize:       13,
        fontWeight:    700,
        fontFamily:    "'Orbitron', monospace",
        textShadow:    "0 0 25px #ff3333",
        letterSpacing:  2,
        marginTop:     10,
        animation:     "mblink 0.5s infinite",
      }}>
        {message}
      </div>
    </div>
  );
}
