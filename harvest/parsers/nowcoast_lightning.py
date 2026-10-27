"""NOAA nowCOAST's lightning strike density -- the newest 15-minute picture -- saved whole.

site/js/scene/weather/lightning.js reads the layer `ldn_lightning_strike_density` of NOAA's nowCOAST WMS: the
capabilities document (10 kB) for the newest slot's time (the `default=` of the layer's time dimension), then one
1440 x 420 PNG of about 7 kB (data/lightning.js). This parser does the same two requests and saves the picture's
bytes in base64 with the slot it is of:

    {"slot": "2026-10-26T21:30:00Z", "width": 1440, "height": 420, "content_type": "image/png",
     "bytes": 6452, "base64": "iVBORw0K..."}

The picture is NOAA's work and is saved as it was sent; the browser decodes the palette into cells exactly as it
does with the live answer (data/lightning.js decodeGrid). `etag` is the slot, so a run that finds the same slot says
"not modified". The slot is at most fifteen minutes old when it is read and the app draws lightning only within an
hour of it, so the registry row promises fifteen minutes and a visitor whose copy is older asks NOAA behind it.
"""

from __future__ import annotations

import base64
import re
from datetime import datetime, timezone

LAYER = "ldn_lightning_strike_density"
BOX = (-25, -180, 80, 180)      # south, west, north, east: data/lightning.js BOX, as WMS 1.3.0 EPSG:4326 wants it
WIDTH, HEIGHT = 1440, 420
MAX_BYTES = 60000               # 6 452 B measured 2026-10-03; a busy day is a few times that

PNG = b"\x89PNG\r\n\x1a\n"


def caps_url(base: str) -> str:
    return f"{base}?service=WMS&version=1.3.0&request=GetCapabilities"


def newest_slot(xml: str) -> datetime | None:
    """The `default=` of the layer's time dimension (data/lightning.js parseNewestSlot), or None."""
    m = re.search(r'<Dimension\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"', xml or "")
    if not m:
        return None
    try:
        return datetime.fromisoformat(m.group(1).replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def iso_ms(dt: datetime) -> str:
    """`2026-10-26T21:30:00.000Z`: the form the layer's `time` dimension is written in."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def iso_s(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def map_url(base: str, slot: datetime) -> str:
    s, w, n, e = BOX
    q = ["SERVICE=WMS", "VERSION=1.3.0", "REQUEST=GetMap", f"LAYERS={LAYER}", "STYLES=", "FORMAT=image/png",
         "TRANSPARENT=true", "CRS=EPSG:4326", f"BBOX={s},{w},{n},{e}", f"WIDTH={WIDTH}", f"HEIGHT={HEIGHT}",
         f"TIME={iso_ms(slot)}"]
    return f"{base}?{'&'.join(q)}"


def fetch(source, prev, *, now: datetime, fetcher) -> dict:
    caps = fetcher(caps_url(source.url))
    total = len(caps.body)
    if caps.status != 200:
        return {"status": caps.status, "text": caps.text[:200], "bytes": total, "etag": None, "not_modified": False, "body": None}
    slot = newest_slot(caps.text)
    if slot is None:
        return {"status": 502, "text": "the capabilities document names no newest time", "bytes": total,
                "etag": None, "not_modified": False, "body": None}
    etag = iso_s(slot)
    if prev is not None and prev.holds_snapshot() and prev.status in ("ok", "not-modified") and prev.etag == etag:
        return {"status": 304, "text": "", "bytes": total, "etag": etag, "not_modified": True, "body": None}
    pic = fetcher(map_url(source.url, slot))
    total += len(pic.body)
    if pic.status != 200:
        return {"status": pic.status, "text": "", "bytes": total, "etag": None, "not_modified": False, "body": None}
    body = {"slot": etag, "width": WIDTH, "height": HEIGHT, "content_type": "image/png", "bytes": len(pic.body),
            "base64": base64.b64encode(pic.body).decode("ascii")}
    return {"status": 200, "text": "", "bytes": total, "etag": etag, "not_modified": False, "body": body}


def validate(body) -> None:
    if not isinstance(body, dict):
        raise ValueError("the saved lightning is an object with its slot and its picture")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", str(body.get("slot"))):
        raise ValueError("the picture names the slot it is of, as 2026-10-26T21:30:00Z")
    try:
        raw = base64.b64decode(body.get("base64") or "", validate=True)
    except Exception as e:  # binascii.Error
        raise ValueError(f"the picture's bytes are not base64: {e}") from None
    if raw[:8] != PNG:
        raise ValueError("the picture is not a PNG")
    if len(raw) > MAX_BYTES:
        raise ValueError(f"the picture is {len(raw)} bytes, over the {MAX_BYTES} a lightning map may cost")


def count(body) -> int:
    validate(body)
    return 1
