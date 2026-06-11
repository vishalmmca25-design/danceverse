"""
mm_store.py — in-memory room/session registry and helpers.
"""
import math
from typing import Optional, Tuple

from mm_config import ZONES
from mm_models import Player, Room

# ─── Global state ──────────────────────────────────────────────────────────────
rooms:    dict[str, Room] = {}
sessions: dict[str, dict] = {}   # sid -> {"room_id": str, "player": Player}


def detect_zone(x: float, z: float) -> str:
    for zone in ZONES:
        px, _, pz = zone["pos"]
        if math.sqrt((x - px) ** 2 + (z - pz) ** 2) < zone["r"]:
            return zone["name"]
    return "Lunar Surface"


def create_room(name: str = "", password: Optional[str] = None) -> Room:
    room = Room(name, password)
    rooms[room.id] = room
    return room


def leave_room(sid: str) -> Tuple[Optional[Room], Optional[Player]]:
    meta = sessions.pop(sid, None)
    if not meta:
        return None, None
    room   = rooms.get(meta["room_id"])
    player = meta["player"]
    if room:
        room.players.pop(sid, None)
        if not room.players and len(rooms) > 1:
            rooms.pop(room.id, None)
            print(f"[room] Deleted empty room {room.id}")
    return room, player
