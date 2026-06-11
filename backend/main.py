"""
MoonMetaverse — FastAPI + Socket.IO Multiplayer Backend
=======================================================
Start: uvicorn main:socket_app --host 0.0.0.0 --port 3001 --reload

REST docs: http://localhost:3001/docs
"""

import asyncio
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mm_api     import router, init_router
from mm_store   import create_room
from mm_tasks   import snapshot_loop, meteor_loop
from mm_sockets import register_all

# ─── Socket.IO ─────────────────────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_interval=5,
    ping_timeout=10,
)

register_all(sio)
init_router(sio)


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    lobby = create_room("Lunar Lobby")
    print(f"[init] Default room: {lobby.id} — {lobby.name}")
    asyncio.create_task(snapshot_loop(sio))
    asyncio.create_task(meteor_loop(sio))
    yield


# ─── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="MoonMetaverse API",
    description="Multiplayer backend for the Lunar Colony metaverse",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

# Socket.IO ASGI wrapper must be the outermost app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
