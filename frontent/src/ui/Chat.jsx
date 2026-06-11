/**
 * ui/Chat.jsx
 * ───────────
 * World chat panel fixed to the bottom-left.
 * Shows server messages, player chat, and system events.
 * Disabled until the player has joined a room.
 */

import { useState, useRef, useEffect } from "react";

export default function Chat({ messages, onSend, disabled }) {
  const [input, setInput] = useState("");
  const endRef = useRef();

  // Auto-scroll to latest message
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
      position:   "fixed", bottom: 20, left: 20,
      width:      300, zIndex: 100,
      fontFamily: "'Orbitron', monospace",
    }}>
      {/* Header */}
      <div style={{
        background:   "rgba(6,6,18,0.9)",
        border:       "1px solid rgba(200,210,255,0.1)",
        borderRadius: "10px 10px 0 0",
        padding:      "5px 13px",
        color:        "rgba(200,210,255,0.35)",
        fontSize:     8, letterSpacing: 3,
      }}>◈ LUNAR COMMS</div>

      {/* Message list */}
      <div style={{
        background:   "rgba(4,4,14,0.93)",
        border:       "1px solid rgba(200,210,255,0.07)",
        borderTop:    "none",
        height:       145,
        overflowY:    "auto",
        padding:      "7px 11px",
        display:      "flex", flexDirection: "column", gap: 4,
      }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ fontSize: 11, lineHeight: 1.45 }}>
            <span style={{
              color:      m.color,
              fontWeight: 700,
              opacity:    m.system ? 0.7 : 1,
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
        display:      "flex",
        border:       "1px solid rgba(200,210,255,0.07)",
        borderTop:    "none",
        borderRadius: "0 0 10px 10px",
        overflow:     "hidden",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={disabled}
          placeholder={disabled ? "Join a room to chat…" : "Broadcast to colony…"}
          style={{
            flex:       1,
            background: "#05050f",
            color:      "#c0cce8",
            border:     "none",
            outline:    "none",
            padding:    "7px 11px",
            fontSize:   10,
            fontFamily: "'Orbitron', monospace",
            opacity:    disabled ? 0.4 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={disabled}
          style={{
            background:  "rgba(200,210,255,0.05)",
            color:       "#c0cce8",
            border:      "none",
            cursor:      disabled ? "not-allowed" : "pointer",
            padding:     "0 14px",
            fontSize:    14,
            borderLeft:  "1px solid rgba(200,210,255,0.07)",
            opacity:     disabled ? 0.4 : 1,
          }}
        >⇒</button>
      </div>
    </div>
  );
}
