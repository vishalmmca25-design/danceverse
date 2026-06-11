"""
mm_tasks.py — snapshot and meteor background coroutines.
"""
import asyncio
import random
import time

import socketio as _sio_t

from mm_config import SNAPSHOT_SECS, METEOR_MIN, METEOR_MAX, METEOR_DUR, METEOR_CHANCE
from mm_store import rooms


async def snapshot_loop(sio: _sio_t.AsyncServer) -> None:
    """Broadcast full world state every N seconds as a fallback sync."""
    while True:
        await asyncio.sleep(SNAPSHOT_SECS)
        for room in list(rooms.values()):
            if room.players:
                await sio.emit(
                    "world_snapshot",
                    {"players": [p.public() for p in room.players.values()], "ts": time.time()},
                    room=room.id,
                )


async def meteor_loop(sio: _sio_t.AsyncServer) -> None:
    """Randomly fire meteor shower events across active rooms."""
    while True:
        await asyncio.sleep(random.uniform(METEOR_MIN, METEOR_MAX))
        for room in list(rooms.values()):
            if room.players and random.random() < METEOR_CHANCE:
                asyncio.create_task(fire_meteor(sio, room.id))


async def fire_meteor(sio: _sio_t.AsyncServer, room_id: str) -> None:
    room = rooms.get(room_id)
    if not room or room.meteor_active:
        return
    room.meteor_active = True
    intensity = random.randint(1, 3)
    print(f"[event] Meteor shower  room={room_id}  intensity={intensity}")
    await sio.emit(
        "meteor_shower_start",
        {"duration": METEOR_DUR * 1000, "intensity": intensity,
         "message": "METEOR SHOWER INCOMING — SEEK SHELTER"},
        room=room_id,
    )
    await asyncio.sleep(METEOR_DUR)
    room.meteor_active = False
    await sio.emit("meteor_shower_end", {"message": "Meteor shower over — safe to proceed"}, room=room_id)
