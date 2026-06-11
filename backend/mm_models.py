import time
import uuid
from typing import Optional

from mm_config import ROOM_CAP


class Player:
    def __init__(self, sid: str, name: str, color: str):
        self.id        = uuid.uuid4().hex[:8]
        self.sid       = sid
        self.name      = name[:20].strip() or "Unknown"
        self.color     = color
        self.pos       = [0.0, 0.0, 8.0]
        self.rot       = 0.0
        self.zone      = "Apollo Base"
        self.oxygen    = 100.0
        self.ping      = 0
        self.joined_at = time.time()

    def public(self) -> dict:
        return dict(
            id=self.id, name=self.name, color=self.color,
            pos=self.pos, rot=self.rot, zone=self.zone,
            oxygen=self.oxygen, ping=self.ping,
        )


class Room:
    def __init__(self, name: str, password: Optional[str] = None):
        self.id            = uuid.uuid4().hex[:8].upper()
        self.name          = (name or f"Room-{self.id}")[:40]
        self.password      = password
        self.created_at    = time.time()
        self.players: dict[str, Player] = {}
        self.meteor_active = False

    def summary(self) -> dict:
        return dict(
            id=self.id, name=self.name,
            hasPassword=bool(self.password),
            playerCount=len(self.players),
            maxPlayers=ROOM_CAP,
            createdAt=self.created_at,
        )
