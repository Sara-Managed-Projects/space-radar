#!/usr/bin/env python3
"""One share picture per page: 1200 x 630, its name, one number, its world's face (public growth task).

A link to /o/1-ceres.html shown in a chat, a feed or a search result carried the site's one card
(og/default.png) for all 274 object pages while every trip had a picture of its own. This writes
`share/<page path>.png` for every page scripts/build_seo.py and scripts/seo_pages.py build, from
pictures the repository already has, and an image sitemap that lists them.

    from seo_share import Spec, available, render_all, SHARE_DIR

WHEN IT RUNS. At deploy time, into the temporary --out directory (nothing here is committed: 330-odd
PNGs would be 20 MB of git history that a rebuilt page makes stale). It needs Pillow, fontTools and
brotli (the site's fonts are WOFF2, FreeType reads TTF: scripts/build_trip_og.py unpacks them the
same way). `available()` says whether they are importable. When they are not, the pages keep the
picture they had before (the Moon's lander, the stations' night side, the site's card) and the
build says so: a deploy host without Pillow ships the same pages as before, never a broken one.
CI installs the three and runs the build with --require-share, so a change that breaks a picture is
refused there even if a deploy host would only have shrugged.

WHAT A PICTURE IS, by `kind`:
  world   the world's own map (registry/textures.yaml, the tier-0 file), turned into a lit globe;
  photo   the card's licensed photograph, darkened on the left under the words;
  exo     a planet of another star: a plain lit disc in a tone from its temperature, with
          "Artist's impression" printed on the picture, because it is one;
  plain   no picture of the thing exists, so the mark's own motif: rings and a dot in the class colour.
A credit line is printed on the picture whenever a map or a photograph is used (CC BY asks for it).

DETERMINISTIC. The star points come from a generator seeded with the page's key, nothing reads the
clock or the network, so the same build is the same bytes (Pillow's encoder permitting).

THE BYTES. Each PNG is held to `og_png_min_bytes` and `og_png_max_bytes` (registry/budgets.yaml, the
trips' rows): an empty frame is refused and a heavy one is re-encoded with a 256-colour palette; one
that still does not fit is drawn without its photograph. Never fetched by the app (og_at_boot_bytes).
"""

from __future__ import annotations

import dataclasses
import io
import math
import random
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "site" / "fonts"
SHARE_DIR = "share"
W, H = 1200, 630
SPACE, FG, DIM, EMBER = (0x0B, 0x0E, 0x14), (0xE8, 0xEC, 0xF2), (0x9A, 0xA4, 0xB2), (0xFF, 0x9F, 0x43)
BUDGETS = ROOT / "registry" / "budgets.yaml"


@dataclasses.dataclass
class Spec:
    key: str                    # the page's path without .html: "o/1-ceres", "starlink/index"
    name: str
    number: str = ""            # the one number, with its unit: "12,742 km"
    caption: str = ""           # the class: "Dwarf planet"
    kind: str = "plain"         # world | photo | exo | plain
    colour: str = "#9aa4b2"
    texture: str = ""           # repo-relative path of an equirectangular map (kind world)
    photo: str = ""             # repo-relative path of the photograph (kind photo)
    credit: str = ""
    tone: str = ""              # exo: a hex colour
    impression: bool = False    # print "Artist's impression" on the picture
    alt: str = ""

    @property
    def rel(self) -> str:
        return f"{SHARE_DIR}/{self.key}.png"


def available() -> bool:
    try:
        import PIL  # noqa: F401
        import fontTools  # noqa: F401
        import brotli  # noqa: F401
    except ImportError:
        return False
    return True


def budget(bid: str, default: int) -> int:
    m = re.search(rf"id:\s*{bid},\s*value:\s*(\d+)", BUDGETS.read_text(encoding="utf-8"))
    return int(m.group(1)) if m else default


_faces: dict = {}
_sized: dict = {}


def face(name: str, px: int):
    """A PIL font from one of the site's WOFF2 files (FreeType reads TTF, so each is unpacked once), and its glyph set."""
    from fontTools.ttLib import TTFont
    from PIL import ImageFont

    if name not in _faces:
        font = TTFont(FONTS / name)
        font.flavor = None
        tmp = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False)
        font.save(tmp.name)
        _faces[name] = (tmp.name, set(font.getBestCmap().keys()))
    path, cmap = _faces[name]
    if (name, px) not in _sized:
        _sized[(name, px)] = ImageFont.truetype(path, px)
    return _sized[(name, px)], cmap


def printable(text: str, name: str) -> str:
    """The text with anything the face has no glyph for folded to ASCII (never a box on a picture)."""
    import unicodedata
    _, cmap = face(name, 12)
    out = []
    for c in text:
        if ord(c) in cmap or c.isspace():
            out.append(c)
        else:
            f = unicodedata.normalize("NFKD", c).encode("ascii", "ignore").decode()
            out.append(f or "")
    return "".join(out)


def hexrgb(h: str, default=DIM):
    m = re.match(r"^#?([0-9a-fA-F]{6})$", h or "")
    return tuple(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)) if m else default


_stars: dict = {}


def starfield(key: str, density: int = 1):
    from PIL import Image, ImageDraw

    rnd = random.Random(f"share:{key}")
    im = Image.new("RGB", (W, H), SPACE)
    g = ImageDraw.Draw(im)
    for _ in range(260 * density):
        x, y = rnd.randrange(W), rnd.randrange(H)
        b = rnd.choice((40, 55, 70, 90, 120, 170))
        r = 1 if rnd.random() < 0.9 else 2
        g.ellipse((x - r + 1, y - r + 1, x + r - 1, y + r - 1), fill=(b, b, min(255, b + 18)))
    return im


def globe(texture: Path, size: int, lon0: float = 0.0):
    """An orthographic lit globe from an equirectangular map. Light from the upper left."""
    from PIL import Image

    src = Image.open(texture).convert("RGB")
    sw, sh = src.size
    sp = src.load()
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    op = out.load()
    r = size / 2.0
    lx, ly, lz = -0.55, -0.45, 0.70
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    for j in range(size):
        y = (j + 0.5 - r) / r
        for i in range(size):
            x = (i + 0.5 - r) / r
            d2 = x * x + y * y
            if d2 >= 1.0:
                continue
            z = math.sqrt(1.0 - d2)
            lat = math.asin(-y)
            lon = lon0 + math.atan2(x, z)
            u = int(((lon / (2 * math.pi) + 0.5) % 1.0) * sw) % sw
            v = min(sh - 1, int((0.5 - lat / math.pi) * sh))
            c = sp[u, v]
            shade = max(0.0, x * lx + y * ly + z * lz)
            k = 0.10 + 0.90 * shade
            edge = min(1.0, (1.0 - d2) * 40.0)
            op[i, j] = (int(c[0] * k), int(c[1] * k), int(c[2] * k), int(255 * edge))
    return out


_discs: dict = {}


def plain_disc(size: int, tone, rings: bool = False):
    key = (size, tuple(tone))
    if key not in _discs:
        _discs[key] = _plain_disc(size, tone)
    return _discs[key]


def _plain_disc(size: int, tone):
    from PIL import Image

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    op = out.load()
    r = size / 2.0
    lx, ly, lz = -0.55, -0.45, 0.70
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    for j in range(size):
        y = (j + 0.5 - r) / r
        for i in range(size):
            x = (i + 0.5 - r) / r
            d2 = x * x + y * y
            if d2 >= 1.0:
                continue
            z = math.sqrt(1.0 - d2)
            shade = max(0.0, x * lx + y * ly + z * lz)
            k = 0.08 + 0.92 * shade
            edge = min(1.0, (1.0 - d2) * 40.0)
            op[i, j] = (int(tone[0] * k), int(tone[1] * k), int(tone[2] * k), int(255 * edge))
    return out


def wrap(text: str, font, room: float, most: int) -> list[str]:
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
    return lines if len(lines) <= most else []


def fit_title(text: str, room: float):
    """The biggest size of Inter 600 (64 down to 34) that sets the name in at most two lines."""
    text = printable(text, "inter-600-latin.woff2")
    for px in range(64, 33, -2):
        font, _ = face("inter-600-latin.woff2", px)
        lines = wrap(text, font, room, 2)
        if lines:
            return font, px, lines
    font, px = face("inter-600-latin.woff2", 34)[0], 34
    return font, px, wrap(text, font, room, 3)[:2]


def compose(spec: Spec, with_picture: bool = True, density: int = 1):
    from PIL import Image, ImageDraw

    im = starfield(spec.key, density)
    g = ImageDraw.Draw(im)
    col = hexrgb(spec.colour)
    kind = spec.kind if with_picture else ("exo" if spec.kind == "exo" else "plain")
    if kind == "photo" and spec.photo and (ROOT / spec.photo).is_file():
        ph = Image.open(ROOT / spec.photo).convert("RGB")
        scale = max(W / ph.width, H / ph.height)
        ph = ph.resize((max(W, round(ph.width * scale)), max(H, round(ph.height * scale))), Image.LANCZOS)
        left, top = (ph.width - W) // 2, (ph.height - H) // 2
        ph = ph.crop((left, top, left + W, top + H))
        row = Image.new("L", (W, 1))
        row.putdata([235 if x < 380 else int(235 * max(0.0, 1 - (x - 380) / 520.0)) + 25 for x in range(W)])
        shade = row.resize((W, H))
        im = Image.composite(Image.new("RGB", (W, H), SPACE), ph, shade)
        g = ImageDraw.Draw(im)
    elif kind in ("world", "exo", "plain"):
        size = 400
        cx, cy = 900, 300
        if kind == "world" and spec.texture and (ROOT / spec.texture).is_file():
            disc = globe(ROOT / spec.texture, size)
        elif kind == "exo":
            disc = plain_disc(size, hexrgb(spec.tone, (120, 140, 170)))
        else:
            disc = None
        if disc is not None:
            # a soft halo, then the globe
            im.paste(disc, (cx - size // 2, cy - size // 2), disc)
        else:
            # a soft glow in the class colour behind the rings: a picture of rings on black alone is flat enough to fall under the empty-frame floor
            for rr in range(300, 0, -3):
                f = ((1 - rr / 300.0) ** 2) * 0.30
                g.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=tuple(int(SPACE[i] + (col[i] - SPACE[i]) * f) for i in range(3)))
            for k, rr in enumerate((190, 135, 80)):
                g.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=tuple(int(c * (0.55 - 0.12 * k)) for c in col), width=3)
            g.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=col)
    pad = 56
    room = 640 if kind != "photo" else 560
    cap_font, _ = face("barlow-semi-condensed-600-latin.woff2", 26)
    g.text((pad, 78), printable(spec.caption.upper(), "barlow-semi-condensed-600-latin.woff2"), font=cap_font, fill=DIM, anchor="ls")
    g.ellipse((pad - 28, 62, pad - 12, 78), fill=col)
    font, px, lines = fit_title(spec.name, room)
    y = 150
    for line in lines:
        g.text((pad, y + px * 0.8), line, font=font, fill=FG, anchor="ls")
        y += px * 1.15
    if spec.number:
        nf, _ = face("jetbrains-mono-500-latin.woff2", 44)
        g.text((pad, y + 56), printable(spec.number, "jetbrains-mono-500-latin.woff2"), font=nf, fill=EMBER, anchor="ls")
    if spec.impression:
        tag, _ = face("inter-600-latin.woff2", 24)
        g.text((pad, H - 74), "Artist’s impression", font=tag, fill=EMBER, anchor="ls")
    small, _ = face("inter-400-latin.woff2", 20)
    g.text((pad, H - 40), "spaceradar.ai", font=small, fill=DIM, anchor="ls")
    if spec.credit:
        cr = printable(spec.credit, "inter-400-latin.woff2")
        small2, _ = face("inter-400-latin.woff2", 16)
        while small2.getlength(cr) > 520 and " " in cr:
            cr = cr.rsplit(" ", 1)[0]
        g.text((W - pad, H - 36), cr, font=small2, fill=DIM, anchor="rs")
    return im


def encode(im, lo: int, hi: int) -> bytes | None:
    """PNG bytes within [lo, hi], or None when it is too heavy even with a palette."""
    buf = io.BytesIO()
    im.save(buf, "PNG", compress_level=6)
    data = buf.getvalue()
    if len(data) > hi:
        buf = io.BytesIO()
        im.quantize(colors=256, method=2, dither=0).save(buf, "PNG", optimize=True)
        data = buf.getvalue()
    return data if len(data) <= hi else None


def render_all(specs: list[Spec], out: Path) -> dict:
    """Write every picture; returns {key: bytes}. Raises SystemExit naming a picture that cannot be made."""
    lo, hi = budget("og_png_min_bytes", 25000), budget("og_png_max_bytes", 400000)
    sizes = {}
    for s in specs:
        data = encode(compose(s), lo, hi)
        # A small dark world on black can encode under the empty-frame floor: more (dimmer) stars, the same picture.
        for density in (2, 3, 4):
            if data is not None and len(data) >= lo:
                break
            data = encode(compose(s, density=density), lo, hi)
        if data is None and s.kind == "photo":
            data = encode(compose(s, with_picture=False), lo, hi)
        if data is None or len(data) < lo:
            raise SystemExit(f"seo_share: {s.key} came to {0 if data is None else len(data)} bytes, outside {lo}..{hi}")
        dest = out / s.rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        sizes[s.key] = len(data)
    return sizes


def image_sitemap(host: str, rows: list[tuple[str, str, str]]) -> str:
    """rows: (page url, picture url, title). The Google image-sitemap extension."""
    import html
    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    body = "\n".join(
        f"<url><loc>{e(page)}</loc><image:image><image:loc>{e(img)}</image:loc><image:title>{e(title)}</image:title></image:image></url>"
        for page, img, title in rows)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
            f"{body}\n</urlset>\n")


if __name__ == "__main__":
    # A look at one picture: python3 scripts/seo_share.py out.png "Kepler-186 f" "1.17 x Earth"
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    spec = Spec(key="try", name=sys.argv[2] if len(sys.argv) > 2 else "Mars", number=sys.argv[3] if len(sys.argv) > 3 else "6,779 km",
                caption="Planet", kind="world", texture="site/textures/2k_mars.webp", credit="Map: Solar System Scope, CC BY 4.0")
    data = encode(compose(spec), 25000, 400000)
    Path(sys.argv[1]).write_bytes(data or b"")
    print(len(data or b""), "bytes")
