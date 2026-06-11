/**
 * constants/index.js
 * All shared config, colours, and zone definitions.
 * Import from here — never hard-code values in components.
 */

export const SERVER_URL  = "http://localhost:3001";
export const GRAVITY     = -0.012;
export const JUMP_FORCE  =  0.22;

export const SUIT_COLORS = [
  "#ffd700", "#39ff14", "#00cfff", "#ff6eb4",
  "#ff9500", "#c77dff", "#00ffcc", "#ff4444",
];

export const ZONES = [
  { name: "Apollo Base",     pos: [ 0,  0,   0], r: 10, color: "#ffd700", icon: "🏛" },
  { name: "Sea of Tranquil", pos: [-28, 0, -24], r: 13, color: "#aaaacc", icon: "🌊" },
  { name: "Helium-3 Mine",   pos: [ 30, 0, -20], r: 10, color: "#7fffee", icon: "⚗" },
  { name: "Lunar Ice Shelf", pos: [  0, 0, -36], r:  9, color: "#c8f0ff", icon: "🧊" },
  { name: "Comm Array",      pos: [-24, 0,  24], r:  8, color: "#39ff14", icon: "📡" },
  { name: "Solar Farm",      pos: [ 26, 0,  22], r:  9, color: "#ffe566", icon: "☀" },
];

/**
 * Global key state — lives outside React so useFrame reads it
 * without stale-closure issues.
 */
export const KEYS = {};
if (typeof window !== "undefined") {
  window.addEventListener("keydown", e => { KEYS[e.code] = true;  });
  window.addEventListener("keyup",   e => { KEYS[e.code] = false; });
}
