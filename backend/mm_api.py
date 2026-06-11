"""
mm_api.py — all FastAPI REST endpoints.
"""
import asyncio
import sys
import time
from typing import Optional

import socketio as _sio_t
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from mm_store import rooms, sessions, create_room
from mm_tasks import fire_meteor

router = APIRouter()
_sio: _sio_t.AsyncServer | None = None


def init_router(sio: _sio_t.AsyncServer) -> None:
    global _sio
    _sio = sio


class CreateRoomBody(BaseModel):
    name:     str           = Field(default="", max_length=40)
    password: Optional[str] = None


@router.get("/health", tags=["Monitor"])
async def health():
    return {
        "status": "online", "rooms": len(rooms),
        "totalPlayers": len(sessions),
        "python": sys.version.split()[0],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@router.get("/stats", tags=["Monitor"])
async def stats():
    return {
        "totalRooms": len(rooms), "totalPlayers": len(sessions),
        "rooms": [
            {"id": r.id, "name": r.name, "players": len(r.players), "meteorActive": r.meteor_active}
            for r in rooms.values()
        ],
    }


@router.get("/rooms", tags=["Rooms"])
async def list_rooms():
    return {"rooms": [r.summary() for r in rooms.values()], "total": len(rooms)}


@router.get("/rooms/{room_id}", tags=["Rooms"])
async def get_room(room_id: str):
    room = rooms.get(room_id.upper())
    if not room:
        raise HTTPException(404, "Room not found")
    return {**room.summary(), "players": [p.public() for p in room.players.values()]}


@router.post("/rooms", tags=["Rooms"], status_code=201)
async def api_create_room(body: CreateRoomBody):
    room = create_room(body.name, body.password)
    return {"ok": True, "room": room.summary()}


@router.delete("/rooms/{room_id}", tags=["Admin"])
async def api_delete_room(room_id: str):
    room = rooms.pop(room_id.upper(), None)
    if not room:
        raise HTTPException(404, "Room not found")
    if _sio:
        await _sio.emit("room_closed", {"message": "Room closed by admin"}, room=room.id)
    return {"ok": True}


@router.post("/rooms/{room_id}/meteor", tags=["Admin"])
async def api_trigger_meteor(room_id: str):
    room = rooms.get(room_id.upper())
    if not room:
        raise HTTPException(404, "Room not found")
    if _sio:
        asyncio.create_task(fire_meteor(_sio, room.id))
    return {"ok": True, "message": f"Meteor triggered in {room.id}"}
