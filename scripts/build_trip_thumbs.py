#!/usr/bin/env python3
"""The trip cards' pictures (spec 0068 task 1): one small WebP per trip, site/images/trips/<id>.webp.

Ivan, 2026-10-02: "tour cards should have in background picture for this tour ... gradual image on
the grid square". The card (ui/trippics.js, ui.css .sr-tripcard) lays the picture under its glass
and fades it out under the title; the trip's intro sheet uses the same file as its header.

    $PY scripts/build_trip_thumbs.py --from=pictures.json   from tools/trip-pictures.probe.js (PIL)
    $PY scripts/build_trip_thumbs.py --from-og [--only=id]  from site/og/<id>.png's scene band (PIL)
    python3 scripts/build_trip_thumbs.py --check            stdlib only: what CI runs

WHERE THE PICTURES COME FROM. The app's own renderer, at each trip's picture stop
(tools/trip-pictures.probe.js says how and which stop): the same scene a visitor flies to, never
a stock photograph that would promise something the trip does not show. `--from-og` is the
fallback for a machine that cannot run the probe: the share picture's scene band, cropped to 16:9.

THE SIZE. 640 x 360: the intro header is the sidebar's 360 CSS px wide, 720 device pixels on a
2x screen, and a card is 160 x 128 CSS px; 640 is the smallest width that does not visibly soften
the header, and space is mostly black, which WebP spends almost nothing on. Each file is encoded
at the highest quality that fits `trip_picture_bytes` (registry/budgets.yaml), from 82 down to 42,
softened by up to a pixel first when even 42 does not fit (encode() says when that happens); a
picture that still does not fit is refused rather than smeared further.

WHY --check NEEDS NOTHING INSTALLED. CI's registry job has PyYAML and nothing else ("every other
one is a thing between a contributor and a green check"), so the check reads the WebP header by
hand: RIFF, WEBP, then the VP8 / VP8L / VP8X chunk that carries the size. It refuses a trip in
registry/tours.yaml without a picture, a picture for no trip, a file that is not a WebP, the wrong
size, and a file over the budget.
"""

from __future__ import annotations

import base64
import io
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "images" / "trips"
TOURS = ROOT / "registry" / "tours.yaml"
BUDGETS = ROOT / "registry" / "budgets.yaml"
OG = ROOT / "site" / "og"
SIZE = (640, 360)
QUALITIES = range(82, 39, -4)


def arg(name: str, default: str = "") -> str:
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a[len(name) + 3:]
    return default


def trip_ids() -> list[str]:
    """The trips, in registry order: every `  - id:` directly under `tours:` (stops are deeper)."""
    ids, inside = [], False
    for line in TOURS.read_text(encoding="utf-8").splitlines():
        if re.match(r"^tours:\s*$", line):
            inside = True
            continue
        if inside and re.match(r"^\S", line):
            break
        m = re.match(r"^  - id:\s*([\w-]+)\s*$", line)
        if inside and m:
            ids.append(m.group(1))
    return ids


def budget() -> int:
    m = re.search(r"\{id:\s*trip_picture_bytes,\s*value:\s*(\d+)", BUDGETS.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit("registry/budgets.yaml has no trip_picture_bytes row")
    return int(m.group(1))


def webp_size(data: bytes) -> tuple[int, int] | None:
    """(width, height) from a WebP's first chunk, or None when it is not one. RFC 9649 §2.5-2.7."""
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    kind, body = data[12:16], data[20:]
    if kind == b"VP8 " and body[3:6] == b"\x9d\x01\x2a":
        w, h = struct.unpack("<HH", body[6:10])
        return w & 0x3FFF, h & 0x3FFF
    if kind == b"VP8L" and body[0] == 0x2F:
        bits = int.from_bytes(body[1:5], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":
        w = int.from_bytes(body[4:7], "little") + 1
        h = int.from_bytes(body[7:10], "little") + 1
        return w, h
    return None


def check() -> int:
    problems = []
    ids = trip_ids()
    limit = budget()
    if not ids:
        problems.append("registry/tours.yaml: no trips found")
    for tid in ids:
        path = OUT / f"{tid}.webp"
        if not path.exists():
            problems.append(f"{path.relative_to(ROOT)}: missing; the {tid} card would show no picture "
                            f"(make it with scripts/build_trip_thumbs.py)")
            continue
        data = path.read_bytes()
        size = webp_size(data)
        if size is None:
            problems.append(f"{path.relative_to(ROOT)}: not a WebP")
        elif size != SIZE:
            problems.append(f"{path.relative_to(ROOT)}: {size[0]} x {size[1]}, wanted {SIZE[0]} x {SIZE[1]}")
        if len(data) > limit:
            problems.append(f"{path.relative_to(ROOT)}: {len(data)} B, over trip_picture_bytes ({limit} B)")
    for path in sorted(OUT.glob("*")) if OUT.exists() else []:
        if path.suffix != ".webp" or path.stem not in ids:
            problems.append(f"{path.relative_to(ROOT)}: no trip of that id in registry/tours.yaml")
    if problems:
        print("trip pictures FAILED:\n  " + "\n  ".join(problems))
        return 1
    sizes = ", ".join(f"{t} {(OUT / f'{t}.webp').stat().st_size}" for t in ids)
    print(f"trip pictures ok: {len(ids)} WebPs at {SIZE[0]} x {SIZE[1]}, each under {limit} B ({sizes})")
    return 0


def encode(im, limit: int) -> tuple[bytes, str]:
    """The best quality that fits; a field of star specks (the Milky Way's 40 000 points) is noise
    to WebP at any quality, so it is softened a little, and then a little more, before giving up."""
    from PIL import ImageFilter

    for blur in (0, 0.6, 1.0):
        src = im.filter(ImageFilter.GaussianBlur(blur)) if blur else im
        for q in QUALITIES:
            buf = io.BytesIO()
            src.save(buf, "WEBP", quality=q, method=6)
            if buf.tell() <= limit:
                return buf.getvalue(), f"q{q}" + (f", blur {blur}" if blur else "")
    raise SystemExit(f"does not fit {limit} B even at quality {QUALITIES[-1]} with a blur of 1 px")


def fit(im):
    """Cover SIZE: crop to 16:9 about the centre, then resample."""
    from PIL import Image

    w, h = im.size
    want = SIZE[0] / SIZE[1]
    if w / h > want:
        cw = round(h * want)
        im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
    else:
        ch = round(w / want)
        im = im.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch))
    return im.resize(SIZE, Image.LANCZOS)


def build() -> int:
    from PIL import Image  # the build needs it; the check does not

    ids = trip_ids()
    only = [x for x in arg("only").split(",") if x]
    limit = budget()
    OUT.mkdir(parents=True, exist_ok=True)
    sources = {}
    probe = arg("from")
    if probe:
        doc = json.loads(Path(probe).read_text(encoding="utf-8"))
        for tid, row in doc.items():
            if not isinstance(row, dict) or "png" not in row:
                print(f"  {tid}: skipped ({row.get('error') if isinstance(row, dict) else row})")
                continue
            im = Image.open(io.BytesIO(base64.b64decode(row["png"].split(",", 1)[1]))).convert("RGB")
            # The probe renders 4:3 so the stop's centre lands a third of the way down the lower
            # 16:9 (tools/trip-pictures.probe.js says why); this keeps that lower 16:9.
            w, h = im.size
            keep = round(w * SIZE[1] / SIZE[0])
            sources[tid] = (im.crop((0, h - keep, w, h)), f"stop {row.get('stop')}")
    elif "--from-og" in sys.argv:
        for tid in ids:
            path = OG / f"{tid}.png"
            if path.exists():
                # The scene is the top 504 rows of 630; the caption band under it is not wanted.
                im = Image.open(path).convert("RGB")
                sources[tid] = (im.crop((0, 0, im.size[0], 504)), path.relative_to(ROOT).as_posix())
    else:
        print(__doc__)
        return 2
    for tid, (im, what) in sources.items():
        if tid not in ids or (only and tid not in only):
            continue
        data, how = encode(fit(im), limit)
        (OUT / f"{tid}.webp").write_bytes(data)
        print(f"  {tid}: {len(data)} B at {how}, from {what}")
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv else build())
