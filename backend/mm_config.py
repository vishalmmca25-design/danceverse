# ─── Server / room limits ──────────────────────────────────────────────────────
MAX_PLAYERS   = 100
ROOM_CAP      = 20

# ─── Background task intervals ─────────────────────────────────────────────────
SNAPSHOT_SECS = 2
METEOR_DUR    = 15
METEOR_MIN    = 120
METEOR_MAX    = 300
METEOR_CHANCE = 0.4

# ─── Zones (mirror of frontend) ────────────────────────────────────────────────
ZONES = [
    {"name": "Apollo Base",     "pos": (  0, 0,   0), "r": 10},
    {"name": "Sea of Tranquil", "pos": (-28, 0, -24), "r": 13},
    {"name": "Helium-3 Mine",   "pos": ( 30, 0, -20), "r": 10},
    {"name": "Lunar Ice Shelf", "pos": (  0, 0, -36), "r":  9},
    {"name": "Comm Array",      "pos": (-24, 0,  24), "r":  8},
    {"name": "Solar Farm",      "pos": ( 26, 0,  22), "r":  9},
]

# ─── Allowed emotes ────────────────────────────────────────────────────────────
VALID_EMOTES = {"wave", "jump", "dance", "salute", "point"}
