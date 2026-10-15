"""SDO/AIA's newest browse picture of the Sun in one wavelength, saved whole (internal spec 0076 W1-d, #916).

The one source whose body is a PICTURE. The Solar Dynamics Observatory's browse archive is a folder per
UTC day, https://sdo.gsfc.nasa.gov/assets/img/browse/YYYY/MM/DD/, listing JPEGs named after the moment
each was taken: `20261015_165658_1024_0171.jpg` is the 1024-pixel AIA 171 angstrom picture of
2026-10-15 16:56:58 UTC. READ 2026-10-15: the day's folder answered 200 with 97 such 171 pictures by
17:00 UTC (one every ten to fifteen minutes), the picture 188 279 bytes, `image/jpeg`, and NO
`Access-Control-Allow-Origin` header, so a page cannot read it (`browser: false`). The folder
`assets/img/latest/` beside it was NOT current that day: its `latest_1024_0171.jpg` said
`Last-Modified: Mon, 21 Sep 2026`, three weeks old, and a name without a date cannot say so. Hence
the folder of the day: the newest name in it is the picture, and the name is its date.

So this parser FETCHES (run.py asks `fetch` when a parser has one): the folder of the UTC day of the
run (and of the day before, when today's has no picture of the wavelength yet), then the newest
picture in it. What it saves is the picture's bytes in base64 with what the name says:

    {"observed": "2026-10-15T16:56:58Z", "instrument": "SDO/AIA", "wavelength_A": 171, "size_px": 1024,
     "file": "20261015_165658_1024_0171.jpg", "url": "https://...", "content_type": "image/jpeg",
     "bytes": 188279, "base64": "/9j/4AAQ..."}

One file of JSON, so it travels every road a saved copy already travels: scripts/refresh-snapshots.sh
publishes `*.json`, the look workflow's `harvest` input merges `<id>.json`, the release zip saves
`/data/v1/` whole. The base64 is a third bigger than the picture: 251 kB for that 188 kB picture.

`etag` is the file's name: a run that finds the same newest name as the copy it holds says "not
modified" and fetches no picture. Nothing is resized or recoloured here (the parser rule: the browser
does what is done to it, scene/sunimage.js).
"""

from __future__ import annotations

import base64
import re
from datetime import datetime, timedelta, timezone

# The browse picture is at most this big, or it is refused (registry/budgets.yaml sun_image_bytes).
MAX_BYTES = 400000
SIZE_PX = 1024
WAVELENGTH = "0171"
_NAME = re.compile(r'href="((\d{8})_(\d{6})_(\d+)_(\d{4})\.jpg)"')


def day_url(template: str, day: datetime) -> str:
    """The row's url with `{ymd}` as the archive writes a day: `2026/10/15`."""
    return template.replace("{ymd}", day.strftime("%Y/%m/%d"))


def newest(listing: str, size: int = SIZE_PX, wavelength: str = WAVELENGTH) -> str | None:
    """The newest picture of this size and wavelength in a folder listing, by the time in its name."""
    best = None
    for m in _NAME.finditer(listing or ""):
        name, ymd, hms, px, wl = m.groups()
        if int(px) != size or wl != wavelength:
            continue
        if best is None or (ymd, hms) > best[0]:
            best = ((ymd, hms), name)
    return best[1] if best else None


def observed_of(name: str) -> str:
    """`20261015_165658_1024_0171.jpg` -> `2026-10-15T16:56:58Z`."""
    m = re.match(r"^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_", name or "")
    if not m:
        raise ValueError(f"{name!r} is not named after its moment")
    y, mo, d, h, mi, s = m.groups()
    return f"{y}-{mo}-{d}T{h}:{mi}:{s}Z"


def fetch(source, prev, *, now: datetime, fetcher) -> dict:
    """The folder of the day (or the day before), then its newest picture. Returns the fields of run.py's
    Fetched: status, text, bytes, etag, not_modified, body. A 4xx or 5xx is returned as an answer."""
    total = 0
    name = None
    folder = None
    last = None
    for back in (0, 1):
        url = day_url(source.url, now.astimezone(timezone.utc) - timedelta(days=back))
        r = fetcher(url)
        total += len(r.body)
        last = r
        if r.status != 200:
            continue
        name = newest(r.text)
        if name:
            folder = url
            break
    if not name:
        status = last.status if last is not None and last.status != 200 else 404
        return {"status": status, "text": f"no {SIZE_PX} px {WAVELENGTH} picture in the folders of today and yesterday",
                "bytes": total, "etag": None, "not_modified": False, "body": None}
    if prev is not None and prev.holds_snapshot() and prev.status in ("ok", "not-modified") and prev.etag == name:
        return {"status": 304, "text": "", "bytes": total, "etag": name, "not_modified": True, "body": None}
    pic = fetcher(folder + name)
    total += len(pic.body)
    if pic.status != 200:
        return {"status": pic.status, "text": pic.text[:200] if "text" in pic.content_type else "",
                "bytes": total, "etag": None, "not_modified": False, "body": None}
    body = {
        "observed": observed_of(name),
        "instrument": "SDO/AIA",
        "wavelength_A": int(WAVELENGTH),
        "size_px": SIZE_PX,
        "file": name,
        "url": folder + name,
        "content_type": (pic.content_type or "image/jpeg").split(";")[0].strip(),
        "bytes": len(pic.body),
        "base64": base64.b64encode(pic.body).decode("ascii"),
    }
    return {"status": 200, "text": "", "bytes": total, "etag": name, "not_modified": False, "body": body}


def validate(body) -> None:
    if not isinstance(body, dict):
        raise ValueError("the saved picture is an object with its date and its bytes")
    obs = body.get("observed")
    if not isinstance(obs, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", obs):
        raise ValueError("the picture names the moment it was taken, as 2026-10-15T16:56:58Z")
    if body.get("instrument") != "SDO/AIA" or not isinstance(body.get("wavelength_A"), int):
        raise ValueError("the picture says which instrument and wavelength took it")
    try:
        raw = base64.b64decode(body.get("base64") or "", validate=True)
    except Exception as e:  # binascii.Error
        raise ValueError(f"the picture's bytes are not base64: {e}") from None
    if raw[:3] != b"\xff\xd8\xff" or raw[-2:] != b"\xff\xd9":
        raise ValueError("the picture is not a whole JPEG")
    if len(raw) > MAX_BYTES:
        raise ValueError(f"the picture is {len(raw)} bytes, over the {MAX_BYTES} the Sun's image may cost")


def count(body) -> int:
    validate(body)
    return 1
