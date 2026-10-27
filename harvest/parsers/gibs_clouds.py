"""NASA GIBS's newest geostationary infrared pictures -- the three the live clouds are made of -- saved whole.

The live clouds (site/js/scene/liveclouds.js, data/gibs.js) are three 2048 x 1024 JPEGs, one per satellite
(GOES-West, GOES-East, Himawari), each the newest real picture of the layer's Band 13 "clean infrared" channel.
A visitor's browser used to ask NASA for all of it on every visit: a DescribeDomains answer per layer (the list of
slots, ~380 bytes) and then up to four GetMap pictures walking back from the newest slot, because GIBS lists a slot
before it has drawn it and answers the not-yet-drawn ones with an all-black 12 572-byte JPEG (BLANK_MAX_BYTES).

So this parser FETCHES, as sdo_aia does (run.py asks `fetch` when a parser has one): per satellite the slots, then
the newest picture that is not the blank, newest first, at most MAX_SLOT_TRIES of them. It saves the pictures'
bytes in base64 with the slot each was taken in:

    {"width": 2048, "height": 1024,
     "satellites": {"goes-west": {"layer": "GOES-West_ABI_Band13_Clean_Infrared", "slot": "2026-10-26T21:30:00Z",
                                  "content_type": "image/jpeg", "bytes": 214075, "base64": "/9j/4AAQ..."}, ...}}

A satellite that has no real picture is left out and the others are saved: the browser composes what it has and
fills the rest from the static map, exactly as it does with NASA's own answers. `etag` is every slot joined, so a
run that finds the same slots says "not modified" and downloads no picture. Nothing is resized or recoloured here:
the palette is turned back into a temperature in the browser (scene/cloudcompose.js).

The satellites and the numbers below are data/gibs.js GEO_SATELLITES, IMAGE_W/H, SLOT_MS, DOMAIN_WINDOW_MS,
MAX_SLOT_TRIES and BLANK_MAX_BYTES; tests/test_harvest_pictures.py holds the two tables to each other.
"""

from __future__ import annotations

import base64
import re
from datetime import datetime, timedelta, timezone

WMTS_DOMAINS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/"
MATRIX_SET = "2km"
IMAGE_W, IMAGE_H = 2048, 1024
SLOT_S = 600
DOMAIN_WINDOW_S = 6 * 3600
MAX_SLOT_TRIES = 4
BLANK_MAX_BYTES = 40000
MAX_BYTES = 700000          # one picture; the largest measured (2026-09-28) was 246 kB

SATELLITES = (
    ("goes-west", "GOES-West_ABI_Band13_Clean_Infrared"),
    ("goes-east", "GOES-East_ABI_Band13_Clean_Infrared"),
    ("himawari", "Himawari_AHI_Band13_Clean_Infrared"),
)


def iso_minute(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:00Z")


def floor_slot(dt: datetime, step_s: int = SLOT_S) -> datetime:
    ts = int(dt.timestamp())
    return datetime.fromtimestamp(ts - ts % step_s, tz=timezone.utc)


def domains_url(layer: str, now: datetime) -> str:
    end = floor_slot(now) + timedelta(seconds=SLOT_S)
    start = end - timedelta(seconds=DOMAIN_WINDOW_S)
    return f"{WMTS_DOMAINS_BASE}{layer}/default/{MATRIX_SET}/all/{iso_minute(start)}--{iso_minute(end)}.xml"


def map_url(base: str, layer: str, slot: datetime) -> str:
    q = ["SERVICE=WMS", "REQUEST=GetMap", "VERSION=1.3.0", f"LAYERS={layer}", "STYLES=", "CRS=EPSG:4326",
         "BBOX=-90,-180,90,180", f"WIDTH={IMAGE_W}", f"HEIGHT={IMAGE_H}", "FORMAT=image/jpeg",
         f"TIME={iso_minute(floor_slot(slot))}"]
    return f"{base}?{'&'.join(q)}"


def parse_domains(xml: str) -> list[tuple[datetime, datetime, int]]:
    """The `<Domain>` as (start, end, step seconds), oldest first; anything unrecognised is skipped."""
    m = re.search(r"<Domain>([^<]*)</Domain>", xml or "")
    out = []
    if not m:
        return out
    for part in m.group(1).split(","):
        bits = part.strip().split("/")
        if len(bits) != 3:
            continue
        step = re.fullmatch(r"PT(\d+)M", bits[2])
        try:
            a = datetime.fromisoformat(bits[0].replace("Z", "+00:00"))
            b = datetime.fromisoformat(bits[1].replace("Z", "+00:00"))
        except ValueError:
            continue
        if not step or b < a:
            continue
        out.append((a, b, int(step.group(1)) * 60))
    return sorted(out)


def candidate_slots(intervals, now: datetime, max_n: int = MAX_SLOT_TRIES) -> list[datetime]:
    """Listed slots no later than `now`, newest first. Never a slot that is not listed: that is the blank."""
    out: list[datetime] = []
    for a, b, step in reversed(intervals):
        s = min(b, floor_slot(now, step))
        s = a + timedelta(seconds=((s - a).total_seconds() // step) * step)
        while s >= a and len(out) < max_n:
            out.append(s)
            s -= timedelta(seconds=step)
        if len(out) >= max_n:
            break
    return out


def _is_jpeg(raw: bytes) -> bool:
    return raw[:3] == b"\xff\xd8\xff" and raw[-2:] == b"\xff\xd9"


def fetch(source, prev, *, now: datetime, fetcher) -> dict:
    """Per satellite the slots, then its newest real picture. Returns run.py's Fetched fields."""
    total = 0
    found: dict[str, dict] = {}
    last_status = 404
    for sat_id, layer in SATELLITES:
        d = fetcher(domains_url(layer, now))
        total += len(d.body)
        if d.status != 200:
            last_status = d.status
            continue
        for slot in candidate_slots(parse_domains(d.text), now):
            # NO conditional request: a picture is only fetched once the slots below say it is new.
            if prev is not None and prev.etag and f"{sat_id}={iso_minute(slot)}" in prev.etag.split("|"):
                found[sat_id] = {"layer": layer, "slot": iso_minute(slot), "same": True}
                break
            pic = fetcher(map_url(source.url, layer, slot))
            total += len(pic.body)
            if pic.status != 200 or len(pic.body) < BLANK_MAX_BYTES or not _is_jpeg(pic.body) or len(pic.body) > MAX_BYTES:
                continue
            found[sat_id] = {
                "layer": layer, "slot": iso_minute(slot),
                "content_type": "image/jpeg", "bytes": len(pic.body),
                "base64": base64.b64encode(pic.body).decode("ascii"),
            }
            break
    if not found:
        return {"status": last_status if last_status != 200 else 404,
                "text": "no satellite had a real picture in its newest slots", "bytes": total,
                "etag": None, "not_modified": False, "body": None}
    etag = "|".join(f"{k}={v['slot']}" for k, v in sorted(found.items()))
    if all(v.get("same") for v in found.values()) and prev is not None and prev.holds_snapshot() and prev.status in ("ok", "not-modified") \
            and etag == prev.etag:
        return {"status": 304, "text": "", "bytes": total, "etag": etag, "not_modified": True, "body": None}
    if any(v.get("same") for v in found.values()):
        # Some slots are unchanged and some are new: the saved file holds whole pictures, so fetch the
        # unchanged ones again rather than save a file with holes. (Rare: the three satellites are on one
        # ten-minute clock, and a run is an hour.)
        for sat_id, v in list(found.items()):
            if v.get("same"):
                slot = datetime.fromisoformat(v["slot"].replace("Z", "+00:00"))
                pic = fetcher(map_url(source.url, v["layer"], slot))
                total += len(pic.body)
                if pic.status == 200 and len(pic.body) >= BLANK_MAX_BYTES and _is_jpeg(pic.body):
                    found[sat_id] = {"layer": v["layer"], "slot": v["slot"], "content_type": "image/jpeg",
                                     "bytes": len(pic.body), "base64": base64.b64encode(pic.body).decode("ascii")}
                else:
                    del found[sat_id]
        etag = "|".join(f"{k}={v['slot']}" for k, v in sorted(found.items()))
    body = {"width": IMAGE_W, "height": IMAGE_H, "satellites": found}
    return {"status": 200, "text": "", "bytes": total, "etag": etag, "not_modified": False, "body": body}


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("satellites"), dict) or not body["satellites"]:
        raise ValueError("the saved clouds are an object with the satellites' pictures")
    known = {k for k, _ in SATELLITES}
    for sid, pic in body["satellites"].items():
        if sid not in known:
            raise ValueError(f"{sid!r} is not one of the three satellites")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", str(pic.get("slot"))):
            raise ValueError(f"{sid}: the picture names the slot it was taken in, as 2026-10-26T21:30:00Z")
        try:
            raw = base64.b64decode(pic.get("base64") or "", validate=True)
        except Exception as e:  # binascii.Error
            raise ValueError(f"{sid}: the picture's bytes are not base64: {e}") from None
        # Not a lower bound: the blank is refused where the picture is fetched (fetch(), BLANK_MAX_BYTES), and a
        # saved file is only checked to be a whole JPEG that the budget allows.
        if not _is_jpeg(raw) or len(raw) > MAX_BYTES:
            raise ValueError(f"{sid}: not a whole JPEG within the {MAX_BYTES} bytes a satellite's picture may cost")


def count(body) -> int:
    validate(body)
    return len(body["satellites"])
