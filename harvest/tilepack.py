"""Quantised point-cloud tiles: the writer half of the A1 layer (public release 1.7.7, internal I#1059).

    from harvest import tilepack
    files = tilepack.build_set(spec, rows, built_at)      # {path: bytes}, nothing written, deterministic

A SET is one catalogue cut into small binary tiles that the browser fetches by what it needs, never at boot:

    set.json          what the set is (schema, partition, levels, tiles, licence); the one file read first
    L<level>/<key>.bin   one tile: `count` records of the schema, as COLUMNS (one typed array per field)
    ids.bin           the pick index: sorted catalogue ids -> (tile, row), so a click or a search finds a card
    names.txt         one name per line, in the id order of ids.bin (optional)

The reader is site/js/data/tilecloud.js; tests/test_tilecloud.mjs holds the two to the same bytes.

WHY COLUMNS AND QUANTISED. A record is a handful of numbers whose precision the picture does not need
past a point (a sky position to 0.001 degree, a magnitude to 0.01, an angle of an orbit to 1e-7 of a
turn). Each field is stored as the smallest integer that holds it to that precision
(`value = offset + q * scale`), one array per field, so a typed array on the page is a view of the file
and gzip/brotli (the CDN's) find the runs. A tile is 12 to 40 bytes a record before compression.

LEVELS are cuts by RANK (brightness, size, mass: whatever the set ranks by; smaller rank = more
important). Level 0 is the few that matter at a glance and level 1 and up add the rest, so the page
draws level 0 first and stops there when the frame-rate latch has tripped or the connection saves data.

PARTITIONS decide which tile a record lands in within its level:
    {"kind": "single"}                                   one tile per level
    {"kind": "bands", "field": f, "edges": [e1, e2...]}  by the value of field f: key b0 below e1, b1 from e1 to e2 ...
    {"kind": "healpix", "nside": n, "lon": f, "lat": g}  by sky cell (RING numbering, as sky/startiles.js); lon and
                                                         lat are fields in DEGREES (right ascension, declination)

TILE FORMAT (little-endian)
    0   'SRTC'
    4   u8 version = 1, u8 level, u16 field count
    8   u32 record count
    12  u32 build (the set's build stamp, seconds since 2000-01-01: a tile from another build is refused)
    16  the columns in schema order, each count * width bytes, each starting at a multiple of its own width
        (zero bytes before it), so a typed array on the page is a view of the file, never a copy

PICK INDEX FORMAT
    0   'SRPI', u8 version = 1, 3 zero bytes, u32 count, u32 build
    16  u32 ids[count] (ascending), u16 tile[count], u32 row[count] (each starting at a multiple of its width)
"""

from __future__ import annotations

import json
import math
import struct
from datetime import datetime, timezone

FORMAT = "SRTC-1"
TILE_MAGIC = b"SRTC"
PICK_MAGIC = b"SRPI"
EPOCH_2000 = datetime(2000, 1, 1, tzinfo=timezone.utc)

#: type -> (struct code, width in bytes, smallest, largest)
TYPES = {
    "u8": ("B", 1, 0, 255),
    "u16": ("H", 2, 0, 65535),
    "u32": ("I", 4, 0, 4294967295),
    "i16": ("h", 2, -32768, 32767),
    "i32": ("i", 4, -2147483648, 2147483647),
    "f32": ("f", 4, None, None),
    "f64": ("d", 8, None, None),
}


class TileError(ValueError):
    """A spec or a record the format cannot hold."""


def build_stamp(built_at: datetime) -> int:
    """Seconds since 2000-01-01 UTC: the number every file of one build carries."""
    return int((built_at - EPOCH_2000).total_seconds())


def check_schema(schema: list[dict]) -> None:
    seen = set()
    for f in schema:
        name = f.get("name")
        if not name or name in seen:
            raise TileError(f"field name {name!r} is missing or repeated")
        seen.add(name)
        if f.get("type") not in TYPES:
            raise TileError(f"field {name}: type {f.get('type')!r} is not one of {sorted(TYPES)}")
        if f["type"] in ("f32", "f64") and ("scale" in f or "offset" in f):
            raise TileError(f"field {name}: a float is stored as it is; scale and offset are for integers")
        if "scale" in f and not f["scale"] > 0:
            raise TileError(f"field {name}: scale must be positive")


def quantise(field: dict, value: float) -> int | float:
    """The number stored for `value`: an integer for an integer field, the value itself for f32."""
    code, _w, lo, hi = TYPES[field["type"]]
    if field["type"] in ("f32", "f64"):
        return float(value)
    q = round((float(value) - field.get("offset", 0.0)) / field.get("scale", 1.0))
    if q < lo or q > hi:
        raise TileError(f"field {field['name']}: {value!r} does not fit {field['type']} at scale {field.get('scale', 1.0)} offset {field.get('offset', 0.0)}")
    return int(q)


def dequantise(field: dict, q: float) -> float:
    if field["type"] in ("f32", "f64"):
        return float(q)
    return field.get("offset", 0.0) + q * field.get("scale", 1.0)


# --- HEALPix (RING), the same arithmetic as site/js/sky/startiles.js ang2pix ---------------------------


def npix(nside: int) -> int:
    return 12 * nside * nside


def ang2pix(nside: int, ra_deg: float, dec_deg: float) -> int:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    z = math.sin(dec)
    x, y = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra)
    za = abs(z)
    phi = math.atan2(y, x)
    if phi < 0:
        phi += 2 * math.pi
    tt = (phi / (math.pi / 2)) % 4
    if za <= 2 / 3:
        t1 = nside * (0.5 + tt)
        t2 = nside * z * 0.75
        jp = math.floor(t1 - t2)
        jm = math.floor(t1 + t2)
        ir = nside + 1 + jp - jm
        kshift = 1 - (ir & 1)
        ip = math.floor((jp + jm - nside + kshift + 1) / 2)
        ip = ((ip % (4 * nside)) + 4 * nside) % (4 * nside)
        return 2 * nside * (nside - 1) + (ir - 1) * 4 * nside + ip
    tp = tt - math.floor(tt)
    tmp = nside * math.sqrt(3 * (1 - za))
    jp = math.floor(tp * tmp)
    jm = math.floor((1 - tp) * tmp)
    ir = jp + jm + 1
    ip = math.floor(tt * ir)
    ip = ((ip % (4 * ir)) + 4 * ir) % (4 * ir)
    return 2 * ir * (ir - 1) + ip if z > 0 else npix(nside) - 2 * ir * (ir + 1) + ip


def tile_key(partition: dict, row: dict) -> str:
    kind = partition.get("kind", "single")
    if kind == "single":
        return "all"
    if kind == "bands":
        v = row[partition["field"]]
        return "b%d" % sum(1 for e in partition["edges"] if v >= e)
    if kind == "healpix":
        return "p%d" % ang2pix(int(partition["nside"]), row[partition["lon"]], row[partition["lat"]])
    raise TileError(f"partition kind {kind!r} is not single, bands or healpix")


# --- one tile ---------------------------------------------------------------------------------------


def align(pos: int, width: int) -> int:
    """The first offset at or after `pos` that is a multiple of `width`."""
    return (pos + width - 1) // width * width


def encode_tile(schema: list[dict], rows: list[dict], level: int, build: int) -> bytes:
    n = len(rows)
    out = bytearray(TILE_MAGIC)
    out += struct.pack("<BBHII", 1, level, len(schema), n, build)
    for f in schema:
        code, width, _lo, _hi = TYPES[f["type"]]
        out += b"\0" * (align(len(out), width) - len(out))
        out += struct.pack("<%d%s" % (n, code), *[quantise(f, r[f["name"]]) for r in rows])
    return bytes(out)


def decode_tile(schema: list[dict], data: bytes) -> dict:
    """The inverse, for tests and the harvester's own checks: {level, build, count, cols: {name: [raw ints/floats]}}."""
    if data[:4] != TILE_MAGIC:
        raise TileError("not a tile")
    ver, level, nf, n, build = struct.unpack_from("<BBHII", data, 4)
    if ver != 1 or nf != len(schema):
        raise TileError("version or field count does not match the schema")
    pos, cols = 16, {}
    for f in schema:
        code, width, _lo, _hi = TYPES[f["type"]]
        pos = align(pos, width)
        cols[f["name"]] = list(struct.unpack_from("<%d%s" % (n, code), data, pos))
        pos += n * width
    return {"level": level, "build": build, "count": n, "cols": cols}


def encode_pick(entries: list[tuple[int, int, int]], build: int) -> bytes:
    """entries: (id, tile index, row), any order."""
    entries = sorted(entries)
    n = len(entries)
    ids = [e[0] for e in entries]
    if len(set(ids)) != n:
        raise TileError("an id appears twice in the pick index")
    out = bytearray(PICK_MAGIC) + struct.pack("<B3xII", 1, n, build)
    out += struct.pack("<%dI" % n, *ids)
    out += struct.pack("<%dH" % n, *[e[1] for e in entries])
    out += b"\0" * (align(len(out), 4) - len(out))
    out += struct.pack("<%dI" % n, *[e[2] for e in entries])
    return bytes(out)


# --- one set ------------------------------------------------------------------------------------------


def build_set(spec: dict, rows: list[dict], built_at: datetime) -> dict[str, bytes]:
    """Cut `rows` into the files of a set.

    spec: {id, title, schema, partition, rank: {field, cuts: [c1, c2...]}, id_field, name_field?, source, licence,
           attribution, classes?} -- `rank.cuts` split the records into len(cuts)+1 levels: level 0 holds rank < c1,
           level 1 c1 <= rank < c2 and so on.
    rows: dicts holding every schema field by name, plus spec['rank']['field'] and the partition's fields even
          when they are not in the schema, and `name` when spec has name_field.
    Returns {relative path: bytes}; set.json last in iteration order, with every tile's size in it.
    """
    check_schema(spec["schema"])
    build = build_stamp(built_at)
    rank = spec["rank"]
    cuts = list(rank.get("cuts") or [])
    if cuts != sorted(cuts):
        raise TileError("rank cuts must ascend")
    id_field = spec["id_field"]
    # Brightest/largest first inside a tile, then by id so the output is the same every run.
    ordered = sorted(rows, key=lambda r: (r[rank["field"]], r[id_field]))
    cells: dict[tuple[int, str], list[dict]] = {}
    for r in ordered:
        level = sum(1 for c in cuts if r[rank["field"]] >= c)
        cells.setdefault((level, tile_key(spec["partition"], r)), []).append(r)

    files: dict[str, bytes] = {}
    tiles, pick = [], []
    for (level, key) in sorted(cells):
        members = cells[(level, key)]
        path = f"L{level}/{key}.bin"
        data = encode_tile(spec["schema"], members, level, build)
        files[path] = data
        ti = len(tiles)
        tiles.append({"key": key, "level": level, "path": path, "count": len(members), "bytes": len(data)})
        pick.extend((int(m[id_field]), ti, i) for i, m in enumerate(members))
    if len(tiles) > 65535:
        raise TileError("more than 65 535 tiles: the pick index holds a tile as a u16")

    files["ids.bin"] = encode_pick(pick, build)
    name_field = spec.get("name_field")
    names_bytes = None
    if name_field:
        by_id = {int(r[id_field]): str(r.get(name_field) or "").replace("\n", " ") for r in rows}
        names_bytes = ("\n".join(by_id[i] for i in sorted(by_id)) + "\n").encode("utf-8")
        files["names.txt"] = names_bytes

    levels = []
    for lv in range(len(cuts) + 1):
        lo = cuts[lv - 1] if lv > 0 else None
        hi = cuts[lv] if lv < len(cuts) else None
        levels.append({"level": lv, "rank_from": lo, "rank_to": hi,
                       "count": sum(t["count"] for t in tiles if t["level"] == lv),
                       "bytes": sum(t["bytes"] for t in tiles if t["level"] == lv)})
    doc = {
        "format": FORMAT,
        "id": spec["id"],
        "title": spec.get("title", spec["id"]),
        "build": build,
        "built_at": built_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(rows),
        "id_field": id_field,
        "rank": {"field": rank["field"], "cuts": cuts, "note": rank.get("note", "")},
        "schema": spec["schema"],
        "partition": spec["partition"],
        "levels": levels,
        "tiles": tiles,
        "pick": {"path": "ids.bin", "bytes": len(files["ids.bin"])},
        "source": spec.get("source", ""),
        "licence": spec.get("licence", ""),
        "attribution": spec.get("attribution", ""),
    }
    if names_bytes is not None:
        doc["names"] = {"path": "names.txt", "bytes": len(names_bytes)}
    for k in ("classes", "stats", "note"):
        if spec.get(k) is not None:
            doc[k] = spec[k]
    files["set.json"] = (json.dumps(doc, indent=1, sort_keys=False) + "\n").encode("utf-8")
    return files
