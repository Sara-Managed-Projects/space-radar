#!/usr/bin/env python3
"""The trips' share pictures: site/og/<id>.png, 1200 x 630, a frame of the trip over its title band.

A shared trip link shows this picture in a chat or a feed (the og:image of site/t/<id>.html,
scripts/gen_trip_pages.py). Until 2026-10-07 six of twenty-six trips had one and the rest showed
default.png, because the pictures were composed inside a browser (scripts/shots.mjs --only=og,
ui/postcard.js ogPicture) and so every change of a blurb needed a browser to print it again
(internal #373: seven pictures went on printing blurbs that had been shortened).

    $PY scripts/build_trip_og.py --from=frames.json [--pick=trip:stop,...] [--only=id,...]
                                             frames from tools/trip-frames.probe.js, band added
    $PY scripts/build_trip_og.py --reband [--only=id,...]
                                             today's title and blurb under the frame each picture
                                             already has: no browser
    $PY scripts/build_trip_og.py --sheet=out.png      every picture on one sheet, to look at
    python3 scripts/build_trip_og.py --check          stdlib only

THE FRAME AND THE WORDS ARE MADE APART. The browser draws the scene (1200 x 504, the scene and
nothing over it); this file lays the band under it with PIL: the map's own background, the title
and the blurb in the site's own faces (site/fonts/, Inter 600 and 400, the sans the UI guide gives
names and titles), "spaceradar.ai" small at the right. The layout is ui/postcard.js's: a 126 px
band, 16 px of padding, the title at 30 px on one line, the blurb at 19 px on at most two.

WHAT IS PRINTED IS WRITTEN INTO THE FILE: a PNG text chunk `sr:caption` holds the title and the
blurb as they were composed. `--check` (and tests/test_contract.mjs, which CI runs) compares it
with registry/tours.yaml, so a blurb edited without `--reband` is refused by name rather than
found by somebody reading a preview in a chat. `--reband` works on the top 504 rows of the
picture itself, which are the frame untouched, so nothing else has to be kept.

THE BYTES. PNG, because the previews' consumers all take it and the frame is mostly flat black; a
frame of forty thousand star points is not, so each file is held to `og_png_max_bytes`
(registry/budgets.yaml) and one that does not fit is written with an adaptive 256-colour palette
(said when it happens). Nothing under /og/ is fetched by the app at any time (og_at_boot_bytes).
"""

from __future__ import annotations

import base64
import io
import json
import re
import struct
import sys
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OG = ROOT / "site" / "og"
FONTS = ROOT / "site" / "fonts"
TOURS = ROOT / "registry" / "tours.yaml"
BUDGETS = ROOT / "registry" / "budgets.yaml"

W, H, BAND = 1200, 630, 126
PIC_H = H - BAND
PAD = 16
MARK = "spaceradar.ai"
MARK_PX = 18
TITLE = {"px": 30, "lh": 1.2, "font": "inter-600-latin.woff2", "max": 1, "gap": 4}
BLURB = {"px": 19, "lh": 1.25, "font": "inter-400-latin.woff2", "max": 2, "gap": 0}
# site/css/ui.css: --sr-space, --sr-text, --sr-text-dim.
SPACE, FG, DIM = (0x0B, 0x0E, 0x14), (0xE8, 0xEC, 0xF2), (0x9A, 0xA4, 0xB2)
CAPTION_KEY = "sr:caption"
# A frame with less of it lit than this is a photograph of an empty sky (the first render of "A
# year in a minute" was 0.6 %: five hairline orbits). Refused when a picture is built.
EMPTY_BELOW = 0.004


def arg(name: str, default: str = "") -> str:
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a[len(name) + 3:]
    return default


def trips() -> list[dict]:
    """[{id, title, blurb}] in registry order, read without PyYAML: the three lines directly under
    `tours:` at their own indent (a stop's `id:` and its card's `title:` are deeper)."""
    out, inside = [], False
    for line in TOURS.read_text(encoding="utf-8").splitlines():
        if re.match(r"^tours:\s*$", line):
            inside = True
            continue
        if inside and re.match(r"^\S", line):
            break
        if not inside:
            continue
        m = re.match(r"^  - id:\s*([\w-]+)\s*$", line)
        if m:
            out.append({"id": m.group(1), "title": None, "blurb": None})
            continue
        m = re.match(r"^    (title|blurb):\s*(\".*\")\s*$", line)
        if m and out and out[-1][m.group(1)] is None:
            out[-1][m.group(1)] = json.loads(m.group(2))
    return out


def budget(name: str) -> int:
    m = re.search(r"\{id:\s*" + name + r",\s*value:\s*(\d+)", BUDGETS.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"registry/budgets.yaml has no {name} row")
    return int(m.group(1))


def caption_of(trip: dict) -> str:
    return f"{trip['title']}\n{trip['blurb']}"


def png_facts(data: bytes) -> dict | None:
    """{size, caption} from a PNG's chunks, or None when it is not one."""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    facts = {"size": struct.unpack(">II", data[16:24]), "caption": None}
    at = 8
    while at + 8 <= len(data):
        length, kind = struct.unpack(">I4s", data[at:at + 8])
        body = data[at + 8:at + 8 + length]
        if kind == b"tEXt" and body.startswith(CAPTION_KEY.encode() + b"\0"):
            facts["caption"] = body[len(CAPTION_KEY) + 1:].decode("latin-1")
        if kind == b"iTXt" and body.startswith(CAPTION_KEY.encode() + b"\0"):
            rest = body[len(CAPTION_KEY) + 1:]
            compressed = rest[0] == 1
            text = rest[2:].split(b"\0", 2)[2]
            facts["caption"] = (zlib.decompress(text) if compressed else text).decode("utf-8")
        if kind == b"IDAT":
            break
        at += 12 + length
    return facts


def check() -> int:
    problems = []
    rows = trips()
    lo, hi = budget("og_png_min_bytes"), budget("og_png_max_bytes")
    if not rows:
        problems.append("registry/tours.yaml: no trips found")
    for trip in rows:
        path = OG / f"{trip['id']}.png"
        rel = path.relative_to(ROOT)
        if not path.exists():
            problems.append(f"{rel}: missing; a shared link to the trip would show default.png "
                            f"(tools/trip-frames.probe.js, then scripts/build_trip_og.py --from=)")
            continue
        data = path.read_bytes()
        facts = png_facts(data)
        if facts is None:
            problems.append(f"{rel}: not a PNG")
            continue
        if facts["size"] != (W, H):
            problems.append(f"{rel}: {facts['size'][0]} x {facts['size'][1]}, wanted {W} x {H}")
        if not lo < len(data) <= hi:
            problems.append(f"{rel}: {len(data)} B, outside og_png_min_bytes to og_png_max_bytes ({lo} to {hi} B)")
        if facts["caption"] != caption_of(trip):
            problems.append(f"{rel}: prints {facts['caption']!r}, and the trip now says {caption_of(trip)!r}; "
                            f"run scripts/build_trip_og.py --reband --only={trip['id']}")
    ids = {t["id"] for t in rows} | {"default"}
    for path in sorted(OG.glob("*")):
        if path.suffix != ".png" or path.stem not in ids:
            problems.append(f"{path.relative_to(ROOT)}: no trip of that id in registry/tours.yaml")
    if problems:
        print("trip share pictures FAILED:\n  " + "\n  ".join(problems))
        return 1
    total = sum((OG / f"{t['id']}.png").stat().st_size for t in rows)
    print(f"trip share pictures ok: {len(rows)} PNGs at {W} x {H}, each printing its trip's title and blurb, "
          f"each under {hi} B ({total} B in all)")
    return 0


# ------------------------------------------------------------------------------------ the build

_faces: dict = {}


def face(name: str, px: int):
    """A PIL font from one of the site's WOFF2 files (FreeType reads TTF, so it is unpacked once)."""
    from fontTools.ttLib import TTFont
    from PIL import ImageFont

    if name not in _faces:
        font = TTFont(FONTS / name)
        font.flavor = None
        tmp = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False)
        font.save(tmp.name)
        _faces[name] = (tmp.name, set(font.getBestCmap().keys()))
    path, cmap = _faces[name]
    return ImageFont.truetype(path, px), cmap


def wrap(text: str, font, room: float, most: int) -> list[str]:
    """ui/postcard.js wrap(): words into lines no wider than `room`; a cut ends in an ellipsis."""
    lines, line = [], ""
    for word in text.split():
        nxt = f"{line} {word}" if line else word
        if not line or font.getlength(nxt) <= room:
            line = nxt
            continue
        lines.append(line)
        line = word
    if line:
        lines.append(line)
    if len(lines) > most:
        lines = lines[:most]
        last = lines[-1]
        while " " in last and font.getlength(last + "…") > room:
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + "…"
    return lines


def compose(frame, trip: dict):
    """The frame over its band. Returns (image, the lines it drew)."""
    from PIL import Image, ImageDraw

    fw, fh = frame.size
    scale = max(W / fw, PIC_H / fh)
    if (fw, fh) != (W, PIC_H):
        frame = frame.resize((round(fw * scale), round(fh * scale)), Image.LANCZOS)
        fw, fh = frame.size
        frame = frame.crop(((fw - W) // 2, (fh - PIC_H) // 2, (fw - W) // 2 + W, (fh - PIC_H) // 2 + PIC_H))
    im = Image.new("RGB", (W, H), SPACE)
    im.paste(frame, (0, 0))
    g = ImageDraw.Draw(im)
    mark_font, _ = face(BLURB["font"], MARK_PX)
    mark_w = mark_font.getlength(MARK)
    inner = W - 2 * PAD
    drawn = []
    y = PIC_H + PAD
    baseline = H - PAD
    for block, text, colour in ((TITLE, trip["title"], FG), (BLURB, trip["blurb"], DIM)):
        font, cmap = face(block["font"], block["px"])
        missing = sorted({c for c in text if ord(c) not in cmap and not c.isspace()})
        if missing:
            raise SystemExit(f"{trip['id']}: {block['font']} has no glyph for {missing}; "
                             f"the picture would print a box")
        # The last block shares its last line with the mark, so it is narrower by the mark and a gap.
        room = inner - mark_w - PAD if block is BLURB else inner
        lines = wrap(text, font, room, block["max"])
        if any(line.endswith("…") for line in lines):
            raise SystemExit(f"{trip['id']}: its {'blurb' if block is BLURB else 'title'} does not fit the band "
                             f"({text!r}); a share picture may not print half a sentence")
        for line in lines:
            line_h = block["px"] * block["lh"]
            y += line_h
            baseline = round(y - line_h * 0.2)
            g.text((PAD, baseline), line, font=font, fill=colour, anchor="ls")
            drawn.append(line)
        y += block["gap"]
    g.text((W - PAD, baseline), MARK, font=mark_font, fill=DIM, anchor="rs")
    return im, drawn


def encode(im, trip: dict, limit: int) -> tuple[bytes, str]:
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo

    info = PngInfo()
    info.add_text(CAPTION_KEY, caption_of(trip))
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True, pnginfo=info)
    if buf.tell() <= limit:
        return buf.getvalue(), "truecolour"
    # Too heavy (a field of star points, the Earth close up): 256 colours chosen for this picture.
    # Dithered when that fits, because a globe's gradients band without it; undithered when not,
    # because dither is noise and noise is what did not fit. --reband reads these same rows back.
    for dither, how in ((Image.Dither.FLOYDSTEINBERG, "256 colours, dithered"), (Image.Dither.NONE, "256 colours")):
        pal = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=dither)
        buf = io.BytesIO()
        pal.save(buf, "PNG", optimize=True, pnginfo=info)
        if buf.tell() <= limit:
            return buf.getvalue(), how
    raise SystemExit(f"{trip['id']}: {buf.tell()} B even with a palette, over og_png_max_bytes ({limit} B)")


def lit_share(frame) -> float:
    """The share of the frame's pixels brighter than the sky, counted at full size so that a figure
    of thin lines is not averaged away."""
    hist = frame.convert("L").histogram()
    return sum(hist[41:]) / max(1, sum(hist))


def build() -> int:
    from PIL import Image

    rows = {t["id"]: t for t in trips()}
    only = [x for x in arg("only").split(",") if x]
    limit = budget("og_png_max_bytes")
    sources: dict = {}
    if arg("from"):
        pick = dict(p.split(":", 1) for p in arg("pick").split(",") if p)
        for path in arg("from").split(","):
            doc = json.loads(Path(path).read_text(encoding="utf-8"))
            for row in doc.get("frames", []):
                tid = row.get("trip")
                if not row.get("og") or tid not in rows:
                    continue
                wanted = pick.get(tid)
                if wanted and wanted not in (row.get("stop"), str(row.get("number"))):
                    continue
                if tid in sources and not wanted:
                    continue
                im = Image.open(io.BytesIO(base64.b64decode(row["og"].split(",", 1)[1]))).convert("RGB")
                sources[tid] = (im, f"stop {row.get('number')} ({row.get('stop')})")
    elif "--reband" in sys.argv:
        for tid in rows:
            path = OG / f"{tid}.png"
            if path.exists():
                im = Image.open(path).convert("RGB")
                sources[tid] = (im.crop((0, 0, W, PIC_H)), "its own frame")
    else:
        print(__doc__)
        return 2
    OG.mkdir(parents=True, exist_ok=True)
    for tid, (frame, what) in sources.items():
        if only and tid not in only:
            continue
        lit = lit_share(frame)
        if lit < EMPTY_BELOW:
            raise SystemExit(f"{tid}: {lit * 100:.2f} % of the frame is lit ({what}): an empty picture; "
                             f"take another stop or a tighter lens (the probe's `trip:stop:zoom`)")
        im, lines = compose(frame, rows[tid])
        data, how = encode(im, rows[tid], limit)
        (OG / f"{tid}.png").write_bytes(data)
        print(f"  {tid}: {len(data)} B, {how}, {lit_share(frame) * 100:.1f} % of the frame lit, from {what}; "
              f"{len(lines) - 1} line(s) of blurb")
    return 0


def sheet(out: str) -> int:
    """Every picture, shrunk, on one sheet in registry order, with its id over it."""
    from PIL import Image, ImageDraw

    rows = trips()
    cols, cw = 4, 450
    ch = round(cw * H / W)
    label = 22
    n = len(rows)
    grid = Image.new("RGB", (cols * cw, ((n + cols - 1) // cols) * (ch + label)), (24, 26, 32))
    g = ImageDraw.Draw(grid)
    font, _ = face(TITLE["font"], 14)
    for i, trip in enumerate(rows):
        x, y = (i % cols) * cw, (i // cols) * (ch + label)
        path = OG / f"{trip['id']}.png"
        if path.exists():
            grid.paste(Image.open(path).convert("RGB").resize((cw - 4, ch - 2), Image.LANCZOS), (x + 2, y + label))
        g.text((x + 6, y + 4), f"{i + 1}. {trip['id']}" + ("" if path.exists() else "  (none)"), font=font, fill=FG)
    grid.save(out)
    print(f"  {out}: {n} trips, {grid.size[0]} x {grid.size[1]}")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    if arg("sheet"):
        sys.exit(sheet(arg("sheet")))
    sys.exit(build())
