/**
 * hooks/useOxygen.js
 * ──────────────────
 * Tracks the local player's oxygen level.
 * Drains slowly on the surface; refills inside Apollo Base (r < 10).
 * Syncs value to the server every tick via sendOxygen.
 */

import { useState, useEffect } from "react";

export default function useOxygen(playerPos, sendOxygen, active) {
  const [oxy, setOxy] = useState(100);

  useEffect(() => {
    if (!active) return;

    const iv = setInterval(() => {
      const atBase = playerPos
        ? Math.sqrt(playerPos[0] ** 2 + playerPos[2] ** 2) < 10
        : false;

      setOxy(prev => {
        const next = atBase
          ? Math.min(100, prev + 2.5)                          // refill
          : Math.max(0,   prev - 0.35 + Math.random() * 0.25); // drain
        sendOxygen(next);
        return next;
      });
    }, 2000);

    return () => clearInterval(iv);
  }, [playerPos, sendOxygen, active]);

  return oxy;
}
