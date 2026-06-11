"""
mm_sockets.py — all Socket.IO event handlers.
"""
import time
import uuid

import socketio

from mm_config import MAX_PLAYERS, ROOM_CAP, VALID_EMOTES
from mm_models import Player
from mm_store import rooms, sessions, detect_zone, create_room, leave_room


def register_all(sio: socketio.AsyncServer) -> None:
    """Attach every socket event handler to `sio`."""

    # ── Connection lifecycle ────────────────────────────────────────────────────

    @sio.event
    async def connect(sid, environ, auth=None):
        print(f"[+] connect  sid={sid}  total={len(sessions) + 1}")

    @sio.event
    async def disconnect(sid):
        print(f"[-] disconnect  sid={sid}")
        room, player = leave_room(sid)
        if room and player:
            await sio.emit("player_left", {"id": player.id, "name": player.name}, room=room.id)

    @sio.event
    async def ping_client(sid, ts):
        await sio.emit("pong_server", ts, to=sid)

    # ── Room management ─────────────────────────────────────────────────────────

    @sio.event
    async def list_rooms_ws(sid):
        await sio.emit("rooms_list", {"rooms": [r.summary() for r in rooms.values()]}, to=sid)

    @sio.event
    async def create_room_ws(sid, data: dict):
        name     = str(data.get("roomName", "")).strip()[:40]
        password = data.get("password") or None
        room     = create_room(name, password)
        print(f"[room] Created  id={room.id}  name='{room.name}'  by={sid}")
        await sio.emit("room_created", {"ok": True, "room": room.summary()}, to=sid)

    @sio.event
    async def join_room(sid, data: dict):
        room_id  = str(data.get("roomId", "")).upper()
        name     = (str(data.get("playerName", "")).strip() or "Unknown")[:20]
        color    = str(data.get("color", "#ffd700"))
        password = data.get("password")

        room = rooms.get(room_id)
        if not room:
            return await sio.emit("join_error", {"error": "Room not found"}, to=sid)
        if room.password and room.password != password:
            return await sio.emit("join_error", {"error": "Wrong password"}, to=sid)
        if len(room.players) >= ROOM_CAP:
            return await sio.emit("join_error", {"error": "Room is full"}, to=sid)
        if len(sessions) >= MAX_PLAYERS:
            return await sio.emit("join_error", {"error": "Server is full"}, to=sid)

        old_room, old_player = leave_room(sid)
        if old_room and old_player:
            await sio.emit("player_left", {"id": old_player.id, "name": old_player.name}, room=old_room.id)
            await sio.leave_room(sid, old_room.id)

        player = Player(sid, name, color)
        room.players[sid] = player
        sessions[sid] = {"room_id": room.id, "player": player}
        await sio.enter_room(sid, room.id)

        existing = [p.public() for s, p in room.players.items() if s != sid]
        await sio.emit(
            "joined_room",
            {"ok": True, "player": player.public(), "existingPlayers": existing,
             "roomId": room.id, "roomName": room.name},
            to=sid,
        )
        await sio.emit("player_joined", player.public(), room=room.id, skip_sid=sid)
        print(f"[join] '{player.name}' -> {room.id}  ({len(room.players)}/{ROOM_CAP})")

    @sio.event
    async def leave_room_ws(sid):
        room, player = leave_room(sid)
        if room and player:
            await sio.emit("player_left", {"id": player.id, "name": player.name}, room=room.id)
            await sio.leave_room(sid, room.id)
        await sio.emit("left_room", {"ok": True}, to=sid)

    # ── Player actions ──────────────────────────────────────────────────────────

    @sio.event
    async def player_move(sid, data: dict):
        meta = sessions.get(sid)
        if not meta:
            return
        room   = rooms.get(meta["room_id"])
        player = room and room.players.get(sid)
        if not player:
            return

        raw = data.get("pos", [0, 0, 0])
        player.pos = [
            max(-62.0, min(62.0, float(raw[0]))),
            max(  0.0, min(20.0, float(raw[1]))),
            max(-62.0, min(62.0, float(raw[2]))),
        ]
        player.rot = float(data.get("rot", 0))

        new_zone = detect_zone(player.pos[0], player.pos[2])
        if new_zone != player.zone:
            player.zone = new_zone
            await sio.emit("zone_changed", {"zone": new_zone}, to=sid)
            await sio.emit("player_zone", {"id": player.id, "zone": new_zone}, room=room.id, skip_sid=sid)

        await sio.emit(
            "player_moved",
            {"id": player.id, "pos": player.pos, "rot": player.rot},
            room=room.id, skip_sid=sid,
        )

    @sio.event
    async def oxygen_update(sid, data: dict):
        meta = sessions.get(sid)
        if not meta:
            return
        room   = rooms.get(meta["room_id"])
        player = room and room.players.get(sid)
        if not player:
            return
        player.oxygen = max(0.0, min(100.0, float(data.get("oxygen", 100))))
        if player.oxygen < 20:
            await sio.emit(
                "player_low_oxygen",
                {"id": player.id, "name": player.name, "oxygen": player.oxygen},
                room=room.id, skip_sid=sid,
            )

    @sio.event
    async def chat_message(sid, data: dict):
        meta = sessions.get(sid)
        if not meta:
            return
        room   = rooms.get(meta["room_id"])
        player = room and room.players.get(sid)
        if not player:
            return
        text = str(data.get("text", "")).strip()[:200]
        if not text:
            return
        msg = dict(
            id=uuid.uuid4().hex[:8], playerId=player.id,
            name=player.name, color=player.color,
            text=text, zone=player.zone, timestamp=time.time(),
        )
        await sio.emit("chat_message", msg, room=room.id)
        print(f"[chat][{room.id}] {player.name}: {text}")

    @sio.event
    async def player_emote(sid, data: dict):
        meta = sessions.get(sid)
        if not meta:
            return
        room   = rooms.get(meta["room_id"])
        player = room and room.players.get(sid)
        emote  = str(data.get("emote", ""))
        if not player or emote not in VALID_EMOTES:
            return
        await sio.emit("player_emote", {"id": player.id, "name": player.name, "emote": emote}, room=room.id)
