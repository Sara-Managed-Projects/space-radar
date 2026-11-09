#!/usr/bin/env python3
"""The trip cards' pictures (spec 0068 task 1): one small WebP per trip, site/images/trips/<id>.webp.

The maintainer, 2026-10-02: "tour cards should have in background picture for this tour ... gradual image on
the grid square". The card (ui/trippics.js, ui.css .sr-tripcard) lays the picture under its glass
and fades it out under the title; the trip's intro sheet uses the same file as its header.

    $PY scripts/build_trip_thumbs.py --from=pictures.json   from tools/trip-pictures.probe.js (PIL)
    $PY scripts/build_trip_thumbs.py --from=a.json,b.json --pick=trip:stop --only=id,...
                                                            from tools/trip-frames.probe.js
    $PY scripts/build_trip_thumbs.py --from-og [--only=id]  from site/og/<id>.png's scene band (PIL)
    python3 scripts/build_trip_thumbs.py --check            stdlib only: what CI runs (the trips' and the Moments')

THE MOMENTS SHELF (release 1.7.7). The Moments under the trips have pictures the same way, site/images/moments/<id>.webp, one
per story on the shelf (site/js/moments/shelf.js SHELF), 640 x 360 and within the same budget. Each is the story's own
frame at its `picture` second (the shelf row names it), rendered by tools/moment-pictures.probe.js:

    node tools/cdp.mjs "http://127.0.0.1:8450/index.html?momentPictures=ID,ID" tools/moment-pictures.probe.js \\
      --width=1200 --height=900 --block=celestrak.org,ll.thespacedevs.com > /tmp/moment-pictures.json
    $PY scripts/build_trip_thumbs.py --moments --from=/tmp/moment-pictures.json [--only=id,...]

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
MOMENTS_OUT = ROOT / "site" / "images" / "moments"
SHELF = ROOT / "site" / "js" / "moments" / "shelf.js"
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


def shelf_ids() -> list[str]:
    """The Moments on the shelf, in its order: the `{ id: '...'` of every row of SHELF (moments/shelf.js)."""
    text = SHELF.read_text(encoding="utf-8")
    m = re.search(r"export const SHELF = \[(.*?)\n\];", text, re.S)
    return re.findall(r"^\s*\{ id: '([\w-]+)'", m.group(1), re.M) if m else []


def shelf_tops() -> dict[str, float]:
    """Where in the 4:3 frame a Moment's 16:9 picture is taken from: the row's `pictureTop` (0 = the top, 1 = the bottom, the
    default, as the trips'). A tall subject (a landed rocket) wants the middle, so that its top is not cut off."""
    text = SHELF.read_text(encoding="utf-8")
    m = re.search(r"export const SHELF = \[(.*?)\n\];", text, re.S)
    tops = {}
    for row in re.findall(r"^\s*\{ id: '[\w-]+'.*$", m.group(1) if m else "", re.M):
        tid = re.match(r"\s*\{ id: '([\w-]+)'", row).group(1)
        t = re.search(r"pictureTop: ([\d.]+)", row)
        tops[tid] = float(t.group(1)) if t else 1.0
    return tops


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


def check_dir(what: str, ids: list[str], out: Path, source: str, limit: int, problems: list[str]) -> str:
    """One folder of pictures against the ids that need them; the problems are appended, the sizes returned."""
    if not ids:
        problems.append(f"{source}: no {what} found")
    for tid in ids:
        path = out / f"{tid}.webp"
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
    for path in sorted(out.glob("*")) if out.exists() else []:
        if path.suffix != ".webp" or path.stem not in ids:
            problems.append(f"{path.relative_to(ROOT)}: no {what[:-1]} of that id in {source}")
    return ", ".join(f"{t} {(out / f'{t}.webp').stat().st_size}" for t in ids if (out / f"{t}.webp").exists())


def check() -> int:
    problems: list[str] = []
    ids, moments = trip_ids(), shelf_ids()
    limit = budget()
    sizes = check_dir("trips", ids, OUT, "registry/tours.yaml", limit, problems)
    check_dir("moments", moments, MOMENTS_OUT, "the SHELF of site/js/moments/shelf.js", limit, problems)
    if problems:
        print("trip pictures FAILED:\n  " + "\n  ".join(problems))
        return 1
    print(f"trip pictures ok: {len(ids)} WebPs at {SIZE[0]} x {SIZE[1]}, each under {limit} B ({sizes}); "
          f"{len(moments)} Moments pictures likewise")
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

    moments = "--moments" in sys.argv
    ids = shelf_ids() if moments else trip_ids()
    out_dir = MOMENTS_OUT if moments else OUT
    only = [x for x in arg("only").split(",") if x]
    limit = budget()
    out_dir.mkdir(parents=True, exist_ok=True)
    sources = {}
    probe = arg("from")
    if probe and moments:
        # tools/moment-pictures.probe.js: {moments: [{id, t, png}]}; the first row of an id is the one used
        # (a run that tried several seconds names the one to keep with --only and a single-second run).
        for one in probe.split(","):
            for row in json.loads(Path(one).read_text(encoding="utf-8")).get("moments", []):
                if row.get("id") in sources:
                    continue
                if not row.get("png"):
                    print(f"  {row.get('id')}: skipped ({row.get('error')})")
                    continue
                im = Image.open(io.BytesIO(base64.b64decode(row["png"].split(",", 1)[1]))).convert("RGB")
                # The probe renders 4:3; as the trips', the picture is its lower 16:9 unless the shelf row says `pictureTop`.
                w, h = im.size
                keep = round(w * SIZE[1] / SIZE[0])
                y0 = round((h - keep) * shelf_tops().get(row["id"], 1.0))
                sources[row["id"]] = (im.crop((0, y0, w, y0 + keep)), f"second {row.get('t')}")
    elif probe:
        doc = {}
        # One file from tools/trip-pictures.probe.js ({trip: {png, stop}}), or several from
        # tools/trip-frames.probe.js ({frames: [{trip, stop, number, png}]}), where a trip may have
        # more than one stop: `--pick=trip:stop` names the one to use, else the first met.
        pick = dict(p.split(":", 1) for p in arg("pick").split(",") if p)
        for one in probe.split(","):
            got = json.loads(Path(one).read_text(encoding="utf-8"))
            if isinstance(got.get("frames"), list):
                for row in got["frames"]:
                    tid, wanted = row.get("trip"), pick.get(row.get("trip"))
                    if not row.get("png") or (wanted and wanted not in (row.get("stop"), str(row.get("number")))):
                        continue
                    if tid not in doc or wanted:
                        doc[tid] = row
            else:
                doc.update(got)
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
        (out_dir / f"{tid}.webp").write_bytes(data)
        print(f"  {tid}: {len(data)} B at {how}, from {what}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(check() if "--check" in sys.argv else build())
