#!/usr/bin/env python3
"""Paper models for a classroom: a paper globe of every world with a real map, a Moon-phase wheel, a
distance-ladder strip and a fold-up James Webb Space Telescope (THE FOLD-UP JWST, below), each one A4 page of PDF (forge #161).

    python3 scripts/paper_models.py --out DIR             write DIR/print/<sheet>.pdf for every sheet
    python3 scripts/paper_models.py --out DIR --only pluto,moon-phase-wheel
    python3 scripts/paper_models.py --list                the plan: every sheet, and every map refused and why

scripts/build_seo.py runs this at deploy (through scripts/seo_pages.py build_extra), so the PDFs are made from the
same files the app wears and are never committed; scripts/seo_print.py writes the page that lists them, /print/.

WHERE A GLOBE COMES FROM. registry/textures.yaml is the one list of maps. Every row of slot `day` or `map` is a
world's own face (the Milky Way, `sky`, is not a world); Venus's radar map (`venus-surface`) is added as a second
globe because Venus's first face is its cloud tops, while the giants' Hubble faces are cloud tops too, of the same
clouds, and are left out. The Sun is left out: it has no surface to map, and its texture pictures one moment of
granulation, not places. A file's licence is read before anything is drawn (licence_allows): public domain, CC0,
CC BY 4.0 and NASA's media guidelines ("generally are not subject to copyright") may be printed and copied;
anything else -- non-commercial, no-derivatives, share-alike, a named author whose terms forbid copies
(check_registry.TEXTURE_REFUSED), or wording this function does not recognise -- is refused and named by --list.

THE GLOBE. Twelve gores of 30 degrees of longitude in the sinusoidal projection (x = (lon - lon0) cos(lat), y =
lat), joined at the equator, so the sheet is one piece; a glue tab on each gore's eastern edge wherever the gap to
its neighbour is wide enough to hold one. At a radius of GLOBE_R_MM the strip is 2 pi R = 257.6 mm long, which fits
A4 landscape and US Letter landscape alike: everything on the page sits inside SAFE (259 x 190 mm, centred), so a
Letter printer at 100 % still leaves 10 mm on every side. The map is resampled bilinearly at 300 dots per inch from
the sharpest file of its row that is one image (a monthly series is not), and the gores are a clip path, so the
cut lines are vector and sharp at any printer's resolution. Each sheet carries the world's name, the true-scale
note (the globe's diameter, 1 : N from the mean radius in registry/worlds.yaml or OTHER_RADII, and the Earth at
that scale), the map's credit word for word from textures.yaml with its licence and source, how much of the world
was mapped when the row says (`coverage`), and a QR code to that world in the app (scripts/qr_encode.py).
Honesty: the map is MEASURED (spacecraft and telescope pictures, as credited); the round shape is MODELLED for the
two worlds that are not round (SHAPE_NOTES), and the sheet says so.

THE PDF is written here, as site/js/ui/printcompose.js pdfFromJpeg writes the postcard's: one JPEG image XObject
(DCTDecode, the JPEG's bytes unchanged), and the rest vector -- lines, the QR's modules as rectangles, and text in
the standard Helvetica and Helvetica-Bold (no font is embedded; HELVETICA holds their Adobe widths, for wrapping).
Pillow is needed for the globes (to read WebP and write JPEG); the wheel and the strip need nothing but Python.
"""

from __future__ import annotations

import math
import re
import sys
import zlib
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from qr_encode import qr_matrix  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://www.spaceradar.ai"
PAGE_W, PAGE_H = 297.0, 210.0                  # A4 landscape, mm
SAFE = (19.0, 10.0, 259.0, 190.0)              # x, y, w, h: inside US Letter landscape's 279.4 x 215.9 too
GLOBE_R_MM = 41.0                              # 2 pi R = 257.6 mm; the globe is 82 mm across
GORES = 12
DPI = 300
EARTH_RADIUS_KM = 6371.0                       # registry/worlds.yaml earth (NASA NSSDCA, volumetric mean)
# Two worlds the app maps that registry/worlds.yaml does not carry (they are records of the far-bodies layer):
OTHER_RADII = {
    "ceres": (469.7, "Park et al. 2016, Nature 537, 515 (Dawn: mean radius 469.7 km)"),
    "vesta": (262.7, "Russell et al. 2012, Science 336, 684 (Dawn: mean radius 262.7 km)"),
}
OTHER_NAMES = {"ceres": "Ceres", "vesta": "Vesta"}
# The record a world is in the app, where it is not the world's own id (site/js/data/tours.js names both).
APP_IDS = {"ceres": "dwarf-ceres", "vesta": "asteroid-vesta"}
SHAPE_NOTES = {
    "phobos": "Phobos is not round (about 27 x 22 x 18 km): this globe wraps its map on a sphere of its mean radius.",
    "vesta": "Vesta is not round (about 573 x 557 x 446 km): this globe wraps its map on a sphere of its mean radius.",
}
# A map that covers less than this share of the sphere says so on its sheet (Europa's 99.5 % does not need saying).
COVERAGE_NOTE_BELOW = 0.98
SECOND_FACES = {"venus-surface": ("venus-radar", "Venus under its clouds")}
LEFT_OUT = {"sun": "the Sun has no surface to map: its texture pictures one moment of granulation, not places"}

# --- licences ---------------------------------------------------------------------------------------------------

def licence_allows(text: str) -> tuple[bool, str]:
    """(may be printed and copied by anyone, the reason). Read from the licence line textures.yaml quotes."""
    from check_registry import TEXTURE_REFUSED
    t = (text or "").strip()
    low = t.lower()
    for bad in TEXTURE_REFUSED:
        if bad in low:
            return False, f"its author's terms forbid copies ({bad})"
    if re.search(r"\bNC\b|non-?commercial", t, re.I):
        return False, "non-commercial only: a school's copy shop sells copies"
    if re.search(r"\bND\b|no-?deriv", t, re.I):
        return False, "no derivatives: a globe is a derivative"
    if re.search(r"\bSA\b|share-?alike", t, re.I):
        return False, "share-alike: the sheet would have to carry that licence"
    if low.startswith("public domain"):
        return True, "public domain"
    if low.startswith("cc0"):
        return True, "CC0, public domain"
    if t.startswith("CC BY 4.0"):
        return True, "CC BY 4.0, with the credit printed"
    if "not subject to copyright" in low and "nasa" in low:
        return True, "NASA media: not subject to copyright in the United States"
    return False, "the licence line does not say copies may be made"


# --- the plan ---------------------------------------------------------------------------------------------------

def _yml(name: str) -> dict:
    return yaml.safe_load((ROOT / "registry" / name).read_text(encoding="utf-8"))


def pick_file(row: dict, root: Path = ROOT) -> dict | None:
    """The sharpest file of a row that is one image on disk, tier 0 or above (tier -1 is the embed's small copy)."""
    files = [f for f in row.get("files", []) if f.get("tier", 0) >= 0 and "{mm}" not in f["file"] and (root / f["file"]).is_file()]
    return max(files, key=lambda f: (f["px"][0], -f["tier"])) if files else None


def plan(textures: dict | None = None, worlds: dict | None = None, root: Path = ROOT) -> tuple[list[dict], list[dict]]:
    """(globes, refused). A globe: {slug, world, name, at, file, px, credit, licence, source, coverage, radius_km, radius_source}."""
    textures = textures or _yml("textures.yaml")
    worlds = worlds or _yml("worlds.yaml")
    by_world = {w["id"]: w for w in worlds["worlds"]}
    globes, refused = [], []
    for row in textures["textures"]:
        wid = row.get("world")
        face = SECOND_FACES.get(row.get("id"))
        if wid == "sky" or not (row.get("slot") in ("day", "map") or face):
            continue
        if wid in LEFT_OUT:
            refused.append({"id": row["id"], "world": wid, "why": LEFT_OUT[wid]})
            continue
        f = pick_file(row, root)
        if f is None:
            refused.append({"id": row["id"], "world": wid, "why": "no file of it is in the tree"})
            continue
        ok, why = licence_allows(f["licence"])
        if not ok:
            refused.append({"id": row["id"], "world": wid, "why": why})
            continue
        w = by_world.get(wid)
        if w and w.get("radius_km"):
            radius, rsrc = float(w["radius_km"]), "registry/worlds.yaml"
        elif wid in OTHER_RADII:
            radius, rsrc = OTHER_RADII[wid]
        else:
            refused.append({"id": row["id"], "world": wid, "why": "no radius to give the scale"})
            continue
        name = (w or {}).get("display") or OTHER_NAMES.get(wid) or wid.title()
        name = re.sub(r"^The ", "", name)
        slug, title = (face if face else (wid, name))
        globes.append({"slug": slug, "world": wid, "name": title, "at": APP_IDS.get(wid, wid), "file": f["file"], "px": f["px"],
                       "credit": f["credit"], "licence": f["licence"], "licence_short": why, "source": f["source"],
                       "coverage": row.get("coverage"), "radius_km": radius, "radius_source": rsrc})
    return sorted(globes, key=lambda g: g["slug"]), refused


# --- the gores --------------------------------------------------------------------------------------------------

def gore_xy(lat_deg: float, lon_deg: float, r: float = GLOBE_R_MM, n: int = GORES) -> tuple[float, float]:
    """Where a point of the sphere falls on the strip, mm from its top-left corner (north up, east to the right)."""
    width = 2 * math.pi * r / n
    k = min(n - 1, int((lon_deg + 180.0) // (360.0 / n)))
    lon0 = -180.0 + (k + 0.5) * 360.0 / n
    lat = math.radians(lat_deg)
    x = (k + 0.5) * width + r * math.radians(lon_deg - lon0) * math.cos(lat)
    y = r * (math.pi / 2 - lat)
    return x, y


def gore_latlon(x, y, r: float = GLOBE_R_MM, n: int = GORES):
    """The inverse, on numpy arrays: (lat_deg, lon_deg, inside). Outside the gores `inside` is False."""
    import numpy as np
    width = 2 * math.pi * r / n
    lat = math.pi / 2 - y / r
    k = np.clip(np.floor(x / width), 0, n - 1)
    xc = (k + 0.5) * width
    c = np.cos(lat)
    half = (math.pi / n) * r * c
    inside = (np.abs(x - xc) <= half) & (c > 1e-9) & (y >= 0) & (y <= math.pi * r)
    lon = -math.pi + (k + 0.5) * (2 * math.pi / n) + (x - xc) / (r * np.maximum(c, 1e-9))
    return np.degrees(lat), np.degrees(lon), inside


def gore_outline(k: int, r: float = GLOBE_R_MM, n: int = GORES, steps: int = 36) -> list[tuple[float, float]]:
    """Gore k's outline, a closed polygon, mm: down its eastern edge from the north tip, up its western edge."""
    lon0 = -180.0 + (k + 0.5) * 360.0 / n
    half = 180.0 / n
    east = [gore_xy(90 - 180 * i / steps, lon0 + half - 1e-9, r, n) for i in range(steps + 1)]
    west = [gore_xy(-90 + 180 * i / steps, lon0 - half + 1e-9, r, n) for i in range(steps + 1)]
    return east + west


def tab_outline(k: int, south: bool, r: float = GLOBE_R_MM, n: int = GORES) -> list[tuple[float, float]]:
    """The glue tab on gore k's eastern edge, in one hemisphere: as wide as 60 % of the gap to the next gore, up to 4 mm.
    Near the equator the gores touch and there is no room; from about 25 degrees there is."""
    lon_e = -180.0 + (k + 1) * 360.0 / n - 1e-9
    pts_edge, pts_out = [], []
    for i in range(25):
        lat = 22 + (84 - 22) * i / 24
        lat = -lat if south else lat
        x, y = gore_xy(lat, lon_e, r, n)
        gap = 2 * (math.pi / n) * r * (1 - math.cos(math.radians(lat)))
        w = min(4.0, 0.6 * gap) * min(1.0, i / 3, (24 - i) / 3)
        pts_edge.append((x, y))
        pts_out.append((x + w, y))
    return pts_edge + pts_out[::-1]


def render_gores(texture: Path, r: float = GLOBE_R_MM, n: int = GORES, dpi: int = DPI):
    """The strip as an RGB image (white outside the gores), from an equirectangular map, sampled bilinearly."""
    import numpy as np
    from PIL import Image
    src = np.asarray(Image.open(texture).convert("RGB"), dtype=np.float32)
    h, w = src.shape[:2]
    px_mm = dpi / 25.4
    W, H = int(round(2 * math.pi * r * px_mm)), int(round(math.pi * r * px_mm))
    xs = ((np.arange(W) + 0.5) / px_mm).astype(np.float32)
    ys = ((np.arange(H) + 0.5) / px_mm).astype(np.float32)
    X, Y = np.meshgrid(xs, ys)
    lat, lon, inside = gore_latlon(X, Y, r, n)
    lat, lon = lat[inside], lon[inside]               # only the pixels on paper are sampled
    u = ((lon + 180.0) / 360.0 * w - 0.5) % w
    v = np.clip((90.0 - lat) / 180.0 * h - 0.5, 0, h - 1)
    u0 = np.floor(u).astype(np.int32)
    v0 = np.floor(v).astype(np.int32)
    fu, fv = (u - u0)[:, None], (v - v0)[:, None]
    u1, v1 = (u0 + 1) % w, np.minimum(v0 + 1, h - 1)
    out = np.full((H, W, 3), 255.0, dtype=np.float32)
    out[inside] = (src[v0, u0] * (1 - fu) * (1 - fv) + src[v0, u1] * fu * (1 - fv) + src[v1, u0] * (1 - fu) * fv + src[v1, u1] * fu * fv)
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))


# --- the scale --------------------------------------------------------------------------------------------------

def round3(x: float) -> str:
    """Three significant figures, in words for millions and billions, grouped by thin spaces otherwise."""
    if x >= 1e9:
        return f"{x / 1e9:.3g} billion"
    if x >= 1e6:
        return f"{x / 1e6:.3g} million"
    v = float(f"{x:.3g}")
    return f"{v:,.0f}".replace(",", " ")


def length_words(mm: float) -> str:
    """A length a person can picture: mm under 10 cm, cm under a metre, m under a kilometre, then km."""
    if mm < 100:
        return f"{mm:.2g} mm" if mm < 10 else f"{mm:.0f} mm"
    if mm < 1000:
        return f"{mm / 10:.0f} cm"
    if mm < 1e6:
        return f"{mm / 1000:.3g} m"
    return f"{round3(mm / 1e6)} km"


MOON_RADIUS_KM = 1737.4                        # registry/worlds.yaml moon (NASA NSSDCA, volumetric mean)


def scale_note(radius_km: float, globe_r_mm: float = GLOBE_R_MM, world: str = "") -> dict:
    """{diameter_mm, ratio (1 : ratio), ratio_words, other, other_words}: the globe, its true scale, and the Earth at that
    scale (the Moon, on the Earth's own sheet)."""
    ratio = radius_km * 1e6 / globe_r_mm
    other, other_km = ("the Moon", MOON_RADIUS_KM) if world == "earth" else ("the Earth", EARTH_RADIUS_KM)
    return {"diameter_mm": 2 * globe_r_mm, "ratio": ratio, "ratio_words": f"1 : {round3(ratio)}",
            "other": other, "other_words": length_words(2 * other_km * 1e6 / ratio)}


# --- the PDF ----------------------------------------------------------------------------------------------------

# Adobe's widths of Helvetica and Helvetica-Bold (the core-14 AFM files), characters 32..126, per 1000 of the size.
HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, *[556] * 10, 278, 278, 584, 584, 584, 556,
             1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
             667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333,
             500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]
HELVETICA_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, *[556] * 10, 333, 333, 584, 584, 584, 611,
                  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
                  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611,
                  389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584]
PT = 72 / 25.4


def text_width(s: str, size_pt: float, bold: bool = False) -> float:
    """Width in mm of `s` in Helvetica at size_pt (a character outside ASCII counts as a digit's width)."""
    table = HELVETICA_BOLD if bold else HELVETICA
    return sum(table[ord(c) - 32] if 32 <= ord(c) < 127 else 556 for c in s) * size_pt / 1000 / PT


def wrap_words(s: str, size_pt: float, width_mm: float, bold: bool = False) -> list[str]:
    """Lines of at most width_mm; a word longer than a line (a web address) is broken after a / or wherever it must."""
    words = []
    for word in s.split():
        while text_width(word, size_pt, bold) > width_mm:
            cut = len(word)
            while cut > 1 and text_width(word[:cut], size_pt, bold) > width_mm:
                cut -= 1
            slash = word.rfind("/", 0, cut)
            cut = slash + 1 if slash > cut // 2 else cut
            words.append(word[:cut])
            word = word[cut:]
        words.append(word)
    lines, cur = [], ""
    for word in words:
        trial = f"{cur} {word}" if cur else word
        if cur and text_width(trial, size_pt, bold) > width_mm:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    return lines + ([cur] if cur else [])


def _pdf_str(s: str) -> bytes:
    b = s.encode("cp1252", errors="replace")
    return b"(" + b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b")"


class Sheet:
    """One page, drawn in mm from the top-left corner; bytes() is the whole PDF."""

    def __init__(self, title: str):
        self.title = title
        # A white page: a PDF page has no colour of its own, and some viewers show it dark.
        self.ops: list[str] = [f"q 1 1 1 rg 0 0 {PAGE_W * PT:.2f} {PAGE_H * PT:.2f} re f Q"]
        self.image: tuple[bytes, int, int] | None = None

    def _p(self, x: float, y: float) -> str:
        return f"{x * PT:.2f} {(PAGE_H - y) * PT:.2f}"

    def _style(self, fill, stroke, lw, dash) -> str:
        out = []
        if fill is not None:
            out.append("{:.3f} {:.3f} {:.3f} rg".format(*fill))
        if stroke is not None:
            out.append("{:.3f} {:.3f} {:.3f} RG {:.2f} w".format(*stroke, lw * PT))
            out.append(f"[{' '.join(f'{d * PT:.2f}' for d in dash)}] 0 d" if dash else "[] 0 d")
        return " ".join(out)

    def _paint(self, fill, stroke) -> str:
        return "B" if fill is not None and stroke is not None else "f" if fill is not None else "S"

    def poly(self, pts, close=True, fill=None, stroke=(0, 0, 0), lw=0.2, dash=None) -> None:
        path = " ".join(f"{self._p(*pt)} {'m' if i == 0 else 'l'}" for i, pt in enumerate(pts)) + (" h" if close else "")
        self.ops.append(f"q {self._style(fill, stroke, lw, dash)} {path} {self._paint(fill, stroke)} Q")

    def rect(self, x, y, w, h, fill=None, stroke=None, lw=0.2) -> None:
        self.ops.append(f"q {self._style(fill, stroke, lw, None)} {x * PT:.2f} {(PAGE_H - y - h) * PT:.2f} {w * PT:.2f} {h * PT:.2f} re {self._paint(fill, stroke)} Q")

    def circle(self, cx, cy, r, fill=None, stroke=(0, 0, 0), lw=0.2, dash=None) -> None:
        k = 0.5523 * r
        X, Y = cx * PT, (PAGE_H - cy) * PT
        R, K = r * PT, k * PT
        path = (f"{X + R:.2f} {Y:.2f} m {X + R:.2f} {Y + K:.2f} {X + K:.2f} {Y + R:.2f} {X:.2f} {Y + R:.2f} c "
                f"{X - K:.2f} {Y + R:.2f} {X - R:.2f} {Y + K:.2f} {X - R:.2f} {Y:.2f} c {X - R:.2f} {Y - K:.2f} {X - K:.2f} {Y - R:.2f} {X:.2f} {Y - R:.2f} c "
                f"{X + K:.2f} {Y - R:.2f} {X + R:.2f} {Y - K:.2f} {X + R:.2f} {Y:.2f} c h")
        self.ops.append(f"q {self._style(fill, stroke, lw, dash)} {path} {self._paint(fill, stroke)} Q")

    def text(self, x, y, s, size=8, bold=False, colour=(0, 0, 0), align="left") -> None:
        if align != "left":
            x -= text_width(s, size, bold) * (0.5 if align == "center" else 1)
        self.ops.append(f"q {colour[0]:.3f} {colour[1]:.3f} {colour[2]:.3f} rg BT /{'F2' if bold else 'F1'} {size} Tf {self._p(x, y)} Td "
                        + _pdf_str(s).decode("latin-1") + " Tj ET Q")

    def para(self, x, y, s, size=7, width=60, lead=None, bold=False, colour=(0.15, 0.15, 0.15)) -> float:
        """A wrapped paragraph from baseline y; returns the baseline after it."""
        lead = lead or size * 1.3 / PT
        for line in wrap_words(s, size, width, bold):
            self.text(x, y, line, size, bold, colour)
            y += lead
        return y

    def qr(self, x, y, size, text) -> None:
        """A QR code `size` mm square including its four-module quiet zone, as vector squares."""
        m = qr_matrix(text)
        n = len(m)
        cell = size / (n + 8)
        self.rect(x, y, size, size, fill=(1, 1, 1))
        parts = []
        for r in range(n):
            for c in range(n):
                if m[r][c]:
                    parts.append(f"{(x + (c + 4) * cell) * PT:.3f} {(PAGE_H - y - (r + 5) * cell) * PT:.3f} {cell * PT + 0.01:.3f} {cell * PT + 0.01:.3f} re")
        self.ops.append("q 0 0 0 rg " + " ".join(parts) + " f Q")

    def jpeg(self, data: bytes, px_w: int, px_h: int, x, y, w, h, clip: list[list[tuple[float, float]]] | None = None) -> None:
        self.image = (data, px_w, px_h)
        path = ""
        if clip:
            path = " ".join(" ".join(f"{self._p(*pt)} {'m' if i == 0 else 'l'}" for i, pt in enumerate(poly)) + " h" for poly in clip) + " W n "
        self.ops.append(f"q {path}{w * PT:.2f} 0 0 {h * PT:.2f} {x * PT:.2f} {(PAGE_H - y - h) * PT:.2f} cm /Im1 Do Q")

    def bytes(self) -> bytes:
        content = zlib.compress("\n".join(self.ops).encode("latin-1"), 9)
        objs = [b"<< /Type /Catalog /Pages 2 0 R >>",
                b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                (f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W * PT:.2f} {PAGE_H * PT:.2f}] /Contents 4 0 R "
                 "/Resources << /Font << /F1 5 0 R /F2 6 0 R >>" + (" /XObject << /Im1 8 0 R >>" if self.image else "") + " >> >>").encode(),
                b"<< /Length " + str(len(content)).encode() + b" /Filter /FlateDecode >>\nstream\n" + content + b"\nendstream",
                b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
                b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
                b"<< /Title " + _pdf_str(self.title) + b" /Producer (Space Radar, scripts/paper_models.py) >>"]
        if self.image:
            data, w, h = self.image
            objs.append(f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB /BitsPerComponent 8 "
                        f"/Filter /DCTDecode /Length {len(data)} >>\nstream\n".encode() + data + b"\nendstream")
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for i, body in enumerate(objs, start=1):
            offsets.append(len(out))
            out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
        xref = len(out)
        out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
        out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
        out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
        return bytes(out)


GREY, DIM, INK = (0.45, 0.45, 0.45), (0.3, 0.3, 0.3), (0.08, 0.08, 0.1)
EMBER = (0.85, 0.45, 0.1)


def footer(s: Sheet, what: str) -> None:
    x, y, w, h = SAFE
    s.text(x, y + h + 3, f"{what} · Space Radar, {HOST.replace('https://', '')}/print/ · made by scripts/paper_models.py", 6, colour=GREY)
    s.text(x + w, y + h + 3, "Print at 100 % (actual size) on A4 or US Letter", 6, colour=GREY, align="right")


# --- a globe ----------------------------------------------------------------------------------------------------

def globe_sheet(g: dict, root: Path = ROOT) -> bytes:
    import io
    x0, y0, w, _ = SAFE
    s = Sheet(f"{g['name']}: a paper globe (Space Radar)")
    sc = scale_note(g["radius_km"], world=g["world"])
    s.text(x0, y0 + 9, g["name"], 22, bold=True, colour=INK)
    s.text(x0, y0 + 16, f"A paper globe, {sc['diameter_mm']:.0f} mm across: a scale of {sc['ratio_words']}. "
           f"{sc['other'][0].upper() + sc['other'][1:]} at this scale would be {sc['other_words']} across.", 9, colour=DIM)
    url = f"{HOST}/#at={g['at']}"
    qr_mm = 24.0
    s.qr(x0 + w - qr_mm, y0 - 1, qr_mm, url)
    s.text(x0 + w - qr_mm - 2, y0 + 9, f"See {g['name'].split(' ')[0]} turn in the live 3D map:", 7, colour=DIM, align="right")
    s.text(x0 + w - qr_mm - 2, y0 + 13, url.replace("https://", ""), 7, bold=True, colour=INK, align="right")
    gx, gy = x0 + (w - 2 * math.pi * GLOBE_R_MM) / 2, y0 + 25
    img = render_gores(root / g["file"])
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=86, optimize=True)
    shift = lambda poly: [(gx + px, gy + py) for px, py in poly]  # noqa: E731
    gores = [shift(gore_outline(k)) for k in range(GORES)]
    for k in range(GORES):
        for south in (False, True):
            s.poly(shift(tab_outline(k, south)), fill=(0.9, 0.9, 0.9), stroke=GREY, lw=0.15)
    s.jpeg(buf.getvalue(), img.width, img.height, gx, gy, 2 * math.pi * GLOBE_R_MM, math.pi * GLOBE_R_MM, clip=gores)
    for poly in gores:
        s.poly(poly, stroke=DIM, lw=0.2)
    for k in range(GORES):
        edge = [(gx + px, gy + py) for px, py in tab_outline(k, False)[:25]]
        s.poly(edge, close=False, stroke=GREY, lw=0.15, dash=(0.8, 0.8))
        edge = [(gx + px, gy + py) for px, py in tab_outline(k, True)[:25]]
        s.poly(edge, close=False, stroke=GREY, lw=0.15, dash=(0.8, 0.8))
    ty = gy + math.pi * GLOBE_R_MM + 6
    col = 74.0
    wide = w - 2 * (col + 6)
    s.text(x0, ty, "How to make it", 8, bold=True, colour=INK)
    steps = ("1. Print at actual size on thick paper (160 to 200 g/m2), or glue the print to thin card. "
             "2. Cut round the outside line, tabs and all. Do not cut along the equator: the gores stay joined there. "
             "3. Fold each grey tab back along its dotted line. "
             "4. Curve the gores up one at a time and glue each tab under the edge of the next gore, the north first, then the south; "
             "the last tab closes the ball. The top of the sheet is north.")
    s.para(x0, ty + 4, steps, 6.5, col)
    cx = x0 + col + 6
    s.text(cx, ty, "True scale", 8, bold=True, colour=INK)
    note = (f"{g['name'].split(' ')[0]}'s mean radius is {g['radius_km']:,.1f} km".replace(",", " ")
            + f" ({g['radius_source']}). At {sc['diameter_mm']:.0f} mm across the globe is {sc['ratio_words']}: "
            f"one millimetre here is {length_words(sc['ratio'])} there. ")
    if g.get("coverage") and g["coverage"] < COVERAGE_NOTE_BELOW:
        note += (f"Only {g['coverage'] * 100:.0f} % of its surface has been photographed well enough to map; the rest is one plain colour, "
                 "and no feature there is invented. ")
    note += SHAPE_NOTES.get(g["world"], "")
    s.para(cx, ty + 4, note, 6.5, col)
    mx = x0 + 2 * (col + 6)
    s.text(mx, ty, "The map", 8, bold=True, colour=INK)
    y = s.para(mx, ty + 4, "Measured: pictures taken by spacecraft and telescopes, as credited here.", 6.5, wide)
    y = s.para(mx, y, g["credit"], 6.5, wide, colour=INK)
    y = s.para(mx, y, f"Licence: {g['licence']}", 5, wide, colour=DIM)
    s.para(mx, y, f"Source: {g['source']}", 5, wide, colour=DIM)
    footer(s, f"{g['name']} paper globe")
    return s.bytes()


# --- the Moon-phase wheel ---------------------------------------------------------------------------------------

SYNODIC_DAYS = 29.530589   # mean synodic month; NASA NSSDCA Moon Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
PHASES = ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"]


def lit_outline(cx: float, cy: float, r: float, elong_deg: float, steps: int = 40) -> list[tuple[float, float]]:
    """The lit part of the Moon's disc seen from the Earth's northern hemisphere, a polygon (empty at new Moon).
    elong_deg: 0 new, 90 first quarter, 180 full, 270 last quarter. The terminator is the half-ellipse
    x = r cos(e) sqrt(1 - (y/r)^2); waxing, the lit side is the right."""
    e = math.radians(elong_deg % 360)
    if abs(math.cos(e) - 1) < 1e-9:
        return []
    sign = 1 if math.sin(e) >= 0 else -1          # waxing: lit on the right; waning: on the left
    limb, term = [], []
    for i in range(steps + 1):
        t = -math.pi / 2 + math.pi * i / steps
        y = r * math.sin(t)
        limb.append((cx + sign * r * math.cos(t), cy + y))
        term.append((cx + sign * r * math.cos(e) * math.cos(t), cy + y))
    return limb + term[::-1]


def lit_fraction(elong_deg: float) -> float:
    """The share of the disc that is lit: (1 - cos e) / 2."""
    return (1 - math.cos(math.radians(elong_deg))) / 2


def moon_wheel_sheet() -> bytes:
    x0, y0, w, h = SAFE
    s = Sheet("Moon-phase wheel (Space Radar)")
    s.text(x0, y0 + 8, "The Moon-phase wheel", 18, bold=True, colour=INK)
    s.para(x0, y0 + 14, "Cut out both discs and pin the small one on the big one through the two centres (a split pin, or a drawing pin "
           "into a cork). Turn the top disc: its window shows where the Moon is on its orbit, seen from above the North Pole, and how it "
           "looks to you from the Earth's northern hemisphere at that place. From the southern hemisphere the Moon looks the other way round, "
           "left to right.", 7.5, w)
    # The base disc: sunlight from the left, the Earth in the middle, the Moon at eight places half lit (inner ring),
    # its look from the Earth (outer ring) and its name; the top disc (TOP_R) hides all but the window's share.
    base_r, top_r, r_in, r_out, r_lab = 66.0, 56.0, 15.0, 30.0, 45.0
    bx, by = x0 + base_r + 2, y0 + 30 + base_r
    s.circle(bx, by, base_r, fill=(1, 1, 1), stroke=DIM, lw=0.3)
    s.circle(bx, by, top_r, stroke=GREY, lw=0.15, dash=(0.6, 1.2))
    s.circle(bx, by, 4.0, fill=(0.25, 0.45, 0.8), stroke=None)
    s.circle(bx, by, 0.8, fill=INK, stroke=None)
    for i in range(5):
        yy = by - 14 + 7 * i
        s.poly([(bx - base_r + 2.5, yy), (bx - top_r - 1.5, yy)], close=False, stroke=EMBER, lw=0.35)
        s.poly([(bx - top_r - 3, yy - 1), (bx - top_r - 1.5, yy), (bx - top_r - 3, yy + 1)], close=False, stroke=EMBER, lw=0.35)
    s.text(bx - (base_r + top_r) / 2, by - 18, "Sun", 6.5, bold=True, colour=EMBER, align="center")
    s.text(bx, by + base_r - 4, "The Moon goes round once in 29.5 days", 5.5, colour=DIM, align="center")
    s.circle(bx, by, r_in, stroke=GREY, lw=0.15, dash=(1, 1))
    for i, name in enumerate(PHASES):
        e = 45.0 * i
        ang = math.radians(180 + e)                   # new Moon towards the Sun (left), then anticlockwise seen from the north
        ca, sa = math.cos(ang), -math.sin(ang)
        mx, my = bx + r_in * ca, by + r_in * sa
        s.circle(mx, my, 3.6, fill=(0.12, 0.12, 0.14), stroke=None)
        half = [(mx + 3.6 * math.cos(t), my + 3.6 * math.sin(t)) for t in [math.pi / 2 + math.pi * j / 20 for j in range(21)]]
        s.poly(half, fill=(1, 0.93, 0.7), stroke=None)    # from above, the half facing the Sun (left) is lit
        s.circle(mx, my, 3.6, stroke=GREY, lw=0.1)
        ox, oy = bx + r_out * ca, by + r_out * sa
        s.circle(ox, oy, 5.4, fill=(0.12, 0.12, 0.14), stroke=None)
        lit = lit_outline(ox, oy, 5.4, e)
        if lit:
            s.poly(lit, fill=(1, 0.93, 0.7), stroke=None)
        s.circle(ox, oy, 5.4, stroke=GREY, lw=0.1)
        lx, ly = bx + r_lab * ca, by + r_lab * sa
        s.text(lx, ly - 0.4, name, 5.6, bold=True, colour=INK, align="center")
        s.text(lx, ly + 2.4, f"day {SYNODIC_DAYS * e / 360:.1f}, {lit_fraction(e) * 100:.0f} % lit", 4.8, colour=DIM, align="center")
    s.text(bx, by - base_r - 2, "Base disc", 8, bold=True, colour=INK, align="center")
    # The top disc: a window from the inner ring to past the names, 36 degrees wide.
    tx, ty = x0 + w - top_r - 4, by
    s.text(tx, ty - top_r - 2, "Top disc", 8, bold=True, colour=INK, align="center")
    s.circle(tx, ty, top_r, fill=(0.96, 0.95, 0.92), stroke=DIM, lw=0.3)
    s.circle(tx, ty, 0.8, fill=INK, stroke=None)
    a0, a1 = math.radians(-90 - 18), math.radians(-90 + 18)
    arc = lambda rad, frm, to: [(tx + rad * math.cos(frm + (to - frm) * j / 16), ty - rad * math.sin(frm + (to - frm) * j / 16)) for j in range(17)]  # noqa: E731
    s.poly(arc(9.5, a0, a1) + arc(52.0, a1, a0), fill=(1, 1, 1), stroke=INK, lw=0.3, dash=(1.2, 0.8))
    s.text(tx, ty + 30, "Cut out", 6.5, bold=True, colour=GREY, align="center")
    s.text(tx, ty + 33.5, "this window", 6.5, bold=True, colour=GREY, align="center")
    for k, line in enumerate(["Inner: the Moon on its orbit, from above.", "Middle: how it looks to you from the Earth.",
                              "The Moon is always half lit, by the Sun;", "the phase is how much of that lit half faces us."]):
        s.text(tx, ty - 30 + 4 * k, line, 6, colour=DIM, align="center")
    s.para(x0, y0 + h - 8, "Computed, not drawn by hand: each picture is the lit share of the disc, (1 - cos e) / 2 for the Moon's angle e from the Sun, "
           "seen straight on, and the day is e / 360 of the mean synodic month, 29.53 days (NASA NSSDCA Moon Fact Sheet, "
           "nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html). Illustrative: the sizes and the distance are not to scale "
           "(the Moon is 30 Earth-widths away), and the real orbit is tilted 5 degrees and not quite round.", 6, w, colour=DIM)
    footer(s, "Moon-phase wheel")
    return s.bytes()


# --- the distance-ladder strip ----------------------------------------------------------------------------------

LY_M = 9.4607304725808e15
UNITS = {"km": 1e3, "light-years": LY_M, "light-year": LY_M}
WORDS = {"million": 1e6, "billion": 1e9}


def distance_m(text: str) -> float:
    """'384 400 km', '4.5 billion km', 'about 425 light-years' -> metres."""
    t = text.replace("about", "").strip()
    m = re.match(r"^([\d .]+?)\s*(million|billion)?\s*(km|light-years?)$", t)
    if not m:
        raise ValueError(f"paper_models: cannot read the distance {text!r}")
    return float(m.group(1).replace(" ", "")) * WORDS.get(m.group(2) or "", 1) * UNITS[m.group(3)]


def ladder_marks(ladder: dict | None = None) -> list[dict]:
    """[{label, distance, m, source}] for every rung of registry/ladder.yaml, nearest first."""
    ladder = ladder or _yml("ladder.yaml")
    rows = [{"label": r["label"], "distance": r["distance"], "m": distance_m(r["distance"]), "source": r["distance_source"]} for r in ladder["rungs"]]
    return sorted(rows, key=lambda r: r["m"])


STRIP_FROM, STRIP_DECADES, STRIP_ROWS = 3, 24, 3       # 10^3 m (a kilometre) to 10^27 m, 8 decades on each of three strips


def strip_pos(m: float) -> float:
    """Where a distance in metres falls, in strips: 0 at a kilometre, 3 at 10^27 m; equal steps for every factor of ten."""
    return (math.log10(m) - STRIP_FROM) / (STRIP_DECADES / STRIP_ROWS)


def strip_ticks() -> list[tuple[float, str]]:
    """(metres, label): every power of ten of kilometres up to 10 billion km, then of light-years from 0.01 ly on,
    so a label is always a round number in the unit a person reads it in."""
    ticks = [(10.0 ** p, f"{round3(10.0 ** (p - 3))} km") for p in range(3, 14)]
    for q in range(-2, 12):
        ly = 10.0 ** q
        ticks.append((ly * LY_M, f"{ly:g} ly" if ly < 1 else f"{round3(ly)} ly"))
    return [(m, t) for m, t in ticks if 0 <= strip_pos(m) <= STRIP_ROWS]


def ladder_sheet() -> bytes:
    x0, y0, w, h = SAFE
    s = Sheet("Distance-ladder strip (Space Radar)")
    s.text(x0, y0 + 8, "The distance ladder: from a kilometre to the edge of what we can see", 15, bold=True, colour=INK)
    s.para(x0, y0 + 14, "Cut out the three strips and glue them end to end (A on A, B on B): one strip about 75 cm long. Each step from one "
           "black tick to the next is ten times farther than the one before (9.5 times where kilometres turn into light-years), so the whole of space fits on a table. Each orange mark is a "
           "place you can fly to in Space Radar.", 7.5, w)
    length, tall = w - 16, 24.0
    marks = ladder_marks()
    sy0 = y0 + 28
    for row in range(STRIP_ROWS):
        sy, sx = sy0 + row * 33, x0 + 8
        s.rect(sx, sy, length, tall, fill=(0.97, 0.96, 0.93), stroke=DIM, lw=0.25)
        if row > 0:
            s.poly([(sx - 8, sy), (sx, sy), (sx, sy + tall), (sx - 8, sy + tall)], close=False, stroke=GREY, lw=0.15, dash=(0.8, 0.8))
            s.text(sx - 4, sy + tall / 2 + 1.5, "AB"[row - 1], 8, bold=True, colour=GREY, align="center")
        if row < STRIP_ROWS - 1:
            s.rect(sx + length, sy, 7, tall, fill=(0.9, 0.9, 0.9), stroke=GREY, lw=0.15)
            s.text(sx + length + 3.5, sy + tall / 2 + 1.5, "AB"[row], 8, bold=True, colour=GREY, align="center")
        for m, label in strip_ticks():
            along = strip_pos(m) - row
            if not 0 <= along <= 1:
                continue
            tx = sx + along * length
            s.poly([(tx, sy), (tx, sy + 3.5)], close=False, stroke=DIM, lw=0.25)
            align = "left" if along < 0.03 else "right" if along > 0.97 else "center"
            s.text(tx + (0.8 if align == "left" else -0.8 if align == "right" else 0), sy + 7, label, 5.5, colour=DIM, align=align)
        for k, mk in enumerate(marks, start=1):
            along = strip_pos(mk["m"]) - row
            if not 0 <= along < 1:
                continue
            mx = sx + along * length
            s.poly([(mx, sy + 9), (mx, sy + 12.5)], close=False, stroke=EMBER, lw=0.6)
            s.circle(mx, sy + 12.5, 0.9, fill=EMBER, stroke=None)
            label, dist = f"{mk['label']} [{k}]", mk["distance"]
            half = max(text_width(label, 6.5, True), text_width(dist, 6)) / 2
            lx = min(max(mx, sx + half + 1), sx + length - half - 1)     # kept on the strip, or it is cut off
            s.text(lx, sy + 17.5, label, 6.5, bold=True, colour=INK, align="center")
            s.text(lx, sy + 21, dist, 6, colour=DIM, align="center")
    y = sy0 + STRIP_ROWS * 33 + 2
    s.text(x0, y, "Where each distance comes from (registry/ladder.yaml, as the app shows them)", 7, bold=True, colour=INK)
    half = (w - 6) / 2
    ys = [y + 4, y + 4]
    for k, mk in enumerate(marks, start=1):
        c = 0 if k <= 5 else 1
        ys[c] = s.para(x0 + c * (half + 6), ys[c], f"[{k}] {mk['label']}, {mk['distance']}: {mk['source']}", 5.2, half, colour=DIM) + 0.6
    s.para(x0, y0 + h - 2, "Measured distances, each from the source named. The spacing is logarithmic: equal lengths are equal factors, "
           "not equal distances.", 5.5, w, colour=DIM)
    footer(s, "Distance-ladder strip")
    return s.bytes()


# --- every sheet ------------------------------------------------------------------------------------------------

EXTRAS = {"moon-phase-wheel": ("The Moon-phase wheel", moon_wheel_sheet), "distance-ladder": ("The distance-ladder strip", ladder_sheet)}


# b200-c3-learn: begin -- forge #161: the fold-up James Webb Space Telescope
# THE FOLD-UP JWST. One page of parts at 1 : 250 (a metre is 4 mm), so the sunshield's five layers fit side by side and
# the whole model is 85 mm long. Every size NASA publishes is used as NASA gives it, read on 2026-11-07:
#   webb.nasa.gov/content/about/faqs/facts.html             "Diameter of Primary Mirror 6.5 m", "Number of Primary Mirror
#                                                           Segments 18", "Size of Sun Shield 21.197 m x 14.162 m"
#   webb.nasa.gov/content/observatory/ote/mirrors/index.html  each segment "1.32 meters (4.3 feet) in diameter, flat to
#                                                           flat"; "Webb's circular secondary mirror is 0.74 meters in diameter"
#   webb.nasa.gov/content/observatory/sunshield.html         five Kapton layers; "Layer 5 (just under the primary mirror) is
#                                                           smallest and Layer 1 is largest"; "as close as an inch or two to
#                                                           each other at the center and around 10" apart ... at the edges"
#   jwst-docs.stsci.edu/jwst-observatory-hardware/jwst-telescope  18 hexagonal segments, the 0.74 m secondary and its
#                                                           "support struts" (three, one above and two below, as NASA's pictures show)
# The layout of the 18 segments is the real one: a hexagonal grid two rings deep with the middle cell left open, the
# hexagons' flat sides up, so the two side columns of three are the wings that fold for launch. That gives 6.10 m point
# to point across and 6.60 m flat to flat top to bottom, which NASA rounds to "6.5 m"; NASA's own 3D model of Webb
# (registry/models.yaml `jwst`, public domain) is 6.08 m across its gold, a cross-check and nothing more: no texture,
# colour or geometry of it is printed. What NASA's pages do not give is ESTIMATED from that model and the sheet says so:
# the sunshield's blunt ends (2.0 m across; its sides meet at the middle), the secondary mirror 7.2 m in front of the
# primary, the bus (3.4 x 2.5 x 1.7 m), the solar array (5.8 x 2.2 m), the high-gain dish (0.6 m), the instrument box
# behind the mirror (2.2 x 2.2 x 1.6 m) and the 0.6 m the telescope stands above the top layer. SIMPLIFIED: the layers
# are flat (the real ones curve and fan apart towards their edges), the steps in size from layer 1 to layer 5 are ours
# (NASA says only which is largest), the boxes are plain, and the struts' feet are on the mirror's edge. Colours are the
# real ones as photographs show them: gold segments, silver Kapton, violet on layer 1's Sun-facing side.
JWST_SCALE = 250                    # 1 : 250
JWST_MM = 1000.0 / JWST_SCALE       # mm on paper per metre of Webb
JWST_SEGMENT_FLAT_M = 1.32          # NASA, mirrors page
JWST_SECONDARY_D_M = 0.74           # NASA, mirrors page; STScI JDox
JWST_SHIELD_M = (21.197, 14.162)    # NASA, facts page: length (Sun line) x width
JWST_SHIELD_END_M = 2.0             # estimated from NASA's 3D model: the width of each blunt end
JWST_LAYER_STEP = 0.025             # ours: each layer 2.5 % smaller than the one below it (NASA: layer 1 largest, 5 smallest)
JWST_SECONDARY_AHEAD_M = 7.2        # estimated from NASA's 3D model
JWST_BUS_M = (3.4, 2.5, 1.7)        # estimated from NASA's 3D model: across, along, tall
JWST_ISIM_M = (2.2, 2.2, 1.6)       # estimated: the box behind the primary, across, tall, deep
JWST_ARRAY_M = (5.8, 2.2)           # estimated: the solar array, long x wide
JWST_DISH_M = 0.6                   # estimated: the high-gain antenna
JWST_TOWER_M = 0.6                  # estimated: the telescope's foot above the top layer
JWST_APP = "deep-jwst"              # the app's record of Webb (registry/missions.yaml `record`), so #at=deep-jwst
JWST_GOLD, JWST_SILVER, JWST_VIOLET = (0.886, 0.729, 0.306), (0.765, 0.773, 0.8), (0.702, 0.569, 0.69)
JWST_BLACK, JWST_FOIL, JWST_CELLS, JWST_EDGE = (0.165, 0.161, 0.18), (0.627, 0.557, 0.627), (0.118, 0.165, 0.275), (0.604, 0.522, 0.314)


def jwst_segment_centres(flat_m: float = JWST_SEGMENT_FLAT_M) -> list[tuple[float, float]]:
    """The 18 primary segments' centres in metres, x across and y up from the mirror's middle: every cell of a hexagonal
    grid (flat sides up) within two steps of the middle, but the middle itself, which is the hole the light leaves by."""
    side = flat_m / math.sqrt(3)
    out = []
    for q in range(-2, 3):
        for r in range(-2, 3):
            s = -q - r
            if max(abs(q), abs(r), abs(s)) > 2 or (q == 0 and r == 0):
                continue
            out.append((1.5 * side * q, flat_m * (r + q / 2)))
    return out


def hexagon(cx: float, cy: float, flat: float) -> list[tuple[float, float]]:
    """A hexagon with its flat sides up and down, `flat` from flat to flat, centred on (cx, cy)."""
    side = flat / math.sqrt(3)
    return [(cx + side * math.cos(math.radians(60 * k)), cy + side * math.sin(math.radians(60 * k))) for k in range(6)]


def shield_outline(cx: float, cy: float, length: float, width: float, end: float) -> list[tuple[float, float]]:
    """The sunshield seen from above, long axis up the page: blunt ends `end` across, the sides meeting at the middle."""
    hl, hw, he = length / 2, width / 2, end / 2
    return [(cx - he, cy - hl), (cx + he, cy - hl), (cx + hw, cy), (cx + he, cy + hl), (cx - he, cy + hl), (cx - hw, cy)]


def shield_layout(x: float, y: float, gap: float = 1.5) -> list[dict]:
    """The five layers on the page at JWST_SCALE: {layer, scale, cx, cy, outline}. They zigzag, odd layers half a length
    lower, so each one's slanting side runs beside its neighbour's: (width + end) / 2 apart, plus a cutting gap."""
    length, width, end = (v * JWST_MM for v in (*JWST_SHIELD_M, JWST_SHIELD_END_M))
    step = (width + end) / 2 + gap
    rows = []
    for k in range(5):
        f = 1 - JWST_LAYER_STEP * k
        cx, cy = x + width / 2 + k * step, y + length / 2 + (k % 2) * (length / 2 + gap)
        rows.append({"layer": k + 1, "scale": f, "cx": cx, "cy": cy, "outline": shield_outline(cx, cy, length * f, width * f, end * f)})
    return rows


def box_net(x: float, y: float, w: float, d: float, h: float, tab: float = 2.5) -> dict:
    """A box's net, `w` across, `d` deep and `h` tall (mm): four sides in a row (front w, side d, back w, side d), a lid and
    a floor on the front face, and a glue tab on the last side. {faces, tabs, folds, size}."""
    xs = [x, x + w, x + w + d, x + 2 * w + d, x + 2 * w + 2 * d]
    faces = [[(xs[i], y + d), (xs[i + 1], y + d), (xs[i + 1], y + d + h), (xs[i], y + d + h)] for i in range(4)]
    faces += [[(x, y), (x + w, y), (x + w, y + d), (x, y + d)], [(x, y + d + h), (x + w, y + d + h), (x + w, y + 2 * d + h), (x, y + 2 * d + h)]]
    t = min(tab, h / 3)
    tabs = [[(xs[4], y + d), (xs[4] + tab, y + d + t), (xs[4] + tab, y + d + h - t), (xs[4], y + d + h)]]
    folds = [[(xs[i], y + d), (xs[i], y + d + h)] for i in range(1, 5)] + [[(x, y + d), (x + w, y + d)], [(x, y + d + h), (x + w, y + d + h)]]
    return {"faces": faces, "tabs": tabs, "folds": folds, "size": (2 * w + 2 * d + tab, 2 * d + h)}


def jwst_struts(flat_m: float = JWST_SEGMENT_FLAT_M, ahead_m: float = JWST_SECONDARY_AHEAD_M) -> list[tuple[str, float]]:
    """(foot, length in metres) of the three struts from the primary's edge to the secondary straight ahead of its middle:
    one from the top of the middle column, two from the outer lower corners of the columns either side of it."""
    side = flat_m / math.sqrt(3)
    top = (0.0, 2.5 * flat_m)
    low = (1.5 * side + side / 2, -2.0 * flat_m)       # the q = 1 column's lowest cell, its outer lower corner
    return [("top", math.hypot(math.hypot(*top), ahead_m)), ("lower left", math.hypot(math.hypot(*low), ahead_m)),
            ("lower right", math.hypot(math.hypot(*low), ahead_m))]


def _parts_label(s: Sheet, x: float, y: float, text: str) -> None:
    s.text(x, y, text, 5.6, bold=True, colour=INK)


def _net(s: Sheet, net: dict, fill) -> None:
    for f in net["faces"]:
        s.poly(f, fill=fill, stroke=INK, lw=0.2)
    for t in net["tabs"]:
        s.poly(t, fill=(0.9, 0.9, 0.9), stroke=INK, lw=0.2)
    for a, b in net["folds"]:
        s.poly([a, b], close=False, stroke=(1, 1, 1), lw=0.25, dash=(0.6, 0.6))


def jwst_sheet() -> bytes:
    x0, y0, w, h = SAFE
    s = Sheet("Fold-up James Webb Space Telescope (Space Radar)")
    s.text(x0, y0 + 8, "The fold-up James Webb Space Telescope", 18, bold=True, colour=INK)
    s.para(x0, y0 + 14, f"Every part at 1 : {JWST_SCALE}: one metre of Webb is {JWST_MM:.0f} mm here, so the sunshield, which NASA calls the size "
           "of a tennis court, is 85 mm long and the gold mirror 26 mm tall. Cut on the solid lines, fold on the dashed ones, glue the grey tabs.", 7.5, w - 30)
    url = f"{HOST}/#at={JWST_APP}"
    qr_mm = 22.0
    s.qr(x0 + w - qr_mm, y0 - 1, qr_mm, url)
    s.text(x0 + w - qr_mm - 2, y0 + 5, "Find Webb at L2 in the live 3D map:", 6.5, colour=DIM, align="right")
    s.text(x0 + w - qr_mm - 2, y0 + 8.5, url.replace("https://", ""), 6.5, bold=True, colour=INK, align="right")
    ys = y0 + 27
    # The five layers of the sunshield.
    for row in shield_layout(x0, ys):
        first = row["layer"] == 1
        s.poly(row["outline"], fill=JWST_VIOLET if first else JWST_SILVER, stroke=INK, lw=0.25)
        s.circle(row["cx"], row["cy"], 3.0, stroke=GREY, lw=0.2, dash=(0.6, 0.6))
        s.text(row["cx"], row["cy"] - 6, f"Layer {row['layer']}", 7, bold=True, colour=INK, align="center")
        sub = "the Sun's side: printed side DOWN" if first else ("the smallest, under the mirror" if row["layer"] == 5 else f"{row['scale'] * 100:.1f} % of layer 1")
        s.text(row["cx"], row["cy"] + 7, sub, 5, colour=INK, align="center")
        s.text(row["cx"], row["cy"] + 1, "glue", 4.5, colour=GREY, align="center")
        s.text(row["cx"], row["outline"][0][1] + 3.5, "telescope end", 4.2, colour=DIM, align="center")
    # The right-hand column: the telescope and the spacecraft.
    xr = x0 + 199
    seg = JWST_SEGMENT_FLAT_M * JWST_MM
    mx, my = xr + 13, ys + 17
    _parts_label(s, xr, ys + 1, "Primary mirror: 18 segments")
    for cx, cy in jwst_segment_centres():   # the beryllium edge under each segment: its outline is the line to cut round
        s.poly(hexagon(mx + cx * JWST_MM, my - cy * JWST_MM, seg), fill=(0.48, 0.49, 0.52), stroke=None)
    for cx, cy in jwst_segment_centres():
        s.poly(hexagon(mx + cx * JWST_MM, my - cy * JWST_MM, seg * 0.9), fill=JWST_GOLD, stroke=None)
    s.poly(hexagon(mx, my, seg * 0.9), fill=JWST_BLACK, stroke=None)
    for k, line in enumerate(["Cut round the", "outer edge. The", "black middle is", "the hole light", "leaves by."]):
        s.text(mx + 15, my - 9 + 2.4 * k, line, 4.8, colour=DIM)
    sx, sy = mx + 30, my + 9
    s.circle(sx, sy, JWST_SECONDARY_D_M * JWST_MM / 2 + 0.6, fill=JWST_GOLD, stroke=INK, lw=0.2)
    s.text(sx + 3, sy + 1, "secondary 0.74 m", 4.8, colour=DIM)
    y = ys + 37
    _parts_label(s, xr, y, "Three struts (black): feet on the mirror's edge")
    for k, (foot, length) in enumerate(jwst_struts()):
        L, yy = length * JWST_MM, y + 2.5 + 4.2 * k
        s.rect(xr, yy, L, 2.4, fill=JWST_BLACK, stroke=INK, lw=0.2)
        s.poly([(xr + L, yy), (xr + L + 2.5, yy + 0.4), (xr + L + 2.5, yy + 2.0), (xr + L, yy + 2.4)], fill=(0.9, 0.9, 0.9), stroke=INK, lw=0.2)
        s.text(xr + L + 4, yy + 2, f"{foot}, {length:.1f} m", 4.8, colour=DIM)
    y = ys + 55
    isim = box_net(xr, y + 2, *(v * JWST_MM for v in (JWST_ISIM_M[0], JWST_ISIM_M[2], JWST_ISIM_M[1])))
    _parts_label(s, xr, y, "Instrument box (behind the mirror)")
    _net(s, isim, JWST_BLACK)
    tw, th = 3.0, JWST_TOWER_M * JWST_MM
    tx = xr + isim["size"][0] + 4
    tower = box_net(tx, y + 2 - tw, tw, tw, th, tab=2.0)
    tower["faces"], tower["folds"] = tower["faces"][:4], tower["folds"][:4]   # a tube: no lid, no floor
    _net(s, tower, JWST_BLACK)
    s.text(tx, y + 2 + th + 3, "Tower: fold it into", 4.6, colour=DIM)
    s.text(tx, y + 2 + th + 5.1, "a 3 mm square tube", 4.6, colour=DIM)
    y = ys + 83
    bus = box_net(xr, y + 2, *(v * JWST_MM for v in (JWST_BUS_M[0], JWST_BUS_M[1], JWST_BUS_M[2])))
    _parts_label(s, xr, y, "Spacecraft bus")
    _net(s, bus, JWST_FOIL)
    y = ys + 115
    _parts_label(s, xr, y, "Solar array and high-gain dish")
    aw, ah = JWST_ARRAY_M[0] * JWST_MM, JWST_ARRAY_M[1] * JWST_MM
    s.rect(xr, y + 2, aw, ah, fill=JWST_CELLS, stroke=INK, lw=0.2)
    for k in range(1, 6):
        s.poly([(xr + aw * k / 6, y + 2), (xr + aw * k / 6, y + 2 + ah)], close=False, stroke=JWST_EDGE, lw=0.15)
    s.poly([(xr, y + 2), (xr - 2.5, y + 2.6), (xr - 2.5, y + 1.4 + ah), (xr, y + 2 + ah)], fill=(0.9, 0.9, 0.9), stroke=INK, lw=0.2)
    s.circle(xr + aw + 5, y + 2 + ah / 2, JWST_DISH_M * JWST_MM / 2, fill=(0.95, 0.95, 0.95), stroke=INK, lw=0.2)
    s.text(xr + aw + 8.5, y + 2 + ah / 2 + 1, "dish", 4.8, colour=DIM)
    # How to make it.
    yb = ys + 134
    col = (w - 8) / 3
    steps = [
        ("1. The sunshield.", "Cut out the five layers. Lay layer 1 printed side down (on Webb its Sun side is violet), then 2, 3, 4 and 5 on top, "
         "every 'telescope end' the same way. Glue them at the middle circle only, so the edges stay a little apart: on Webb the layers are "
         "1 to 2 inches apart at the middle and about 10 inches at the edges."),
        ("2. The spacecraft.", "Fold the bus into a box and glue it under the middle of layer 1. Glue the solar array to the bus's face "
         "that looks away from the telescope end, sticking out under the shield, and the dish dot under the bus."),
        ("3. The telescope.", "Fold the tower and stand it on the middle of layer 5. Fold the instrument box, glue it on the tower, and glue the "
         "mirror upright on its face looking towards the telescope end. Glue the struts' feet on the mirror's edge (one at the top, two low at "
         "either side) and their tabs together in front of the hole, with the secondary on them."),
    ]
    for k, (head, body) in enumerate(steps):
        x = x0 + k * (col + 4)
        s.text(x, yb, head, 6.5, bold=True, colour=INK)
        s.para(x, yb + 3.2, body, 5.6, col, colour=DIM)
    s.para(x0, y0 + h - 7.5, "To scale, from NASA (webb.nasa.gov facts, mirrors and sunshield pages; STScI JWST User Documentation, read 2026-11-07): "
           "the 18 segments, 1.32 m flat to flat, in their real layout (6.5 m across), the 0.74 m secondary, and the sunshield's 21.197 x 14.162 m. "
           "Estimated from NASA's own 3D model of Webb, as NASA's pages do not give them: the shield's blunt ends, the bus, the solar array, the dish, "
           "the instrument box, the tower and the secondary's 7.2 m from the primary. Simplified: flat layers (the real ones curve and fan apart at "
           "their edges), our own steps in size from layer 1 to 5, plain boxes, no booms, cables or radiators.", 5.2, w, colour=DIM)
    footer(s, "Fold-up James Webb Space Telescope")
    return s.bytes()


EXTRAS["jwst-fold-up"] = ("The fold-up James Webb Space Telescope", jwst_sheet)
# b200-c3-learn: end


def have_pillow() -> bool:
    try:
        import numpy  # noqa: F401
        from PIL import Image  # noqa: F401
        return True
    except ImportError:
        return False


def write_all(out: Path, only: set[str] | None = None, root: Path = ROOT) -> list[tuple[str, int]]:
    """Write <out>/print/<slug>.pdf for every sheet (or those named); returns [(slug, bytes)]."""
    dest = out / "print"
    dest.mkdir(parents=True, exist_ok=True)
    done = []
    globes = plan(root=root)[0] if have_pillow() else []
    for g in globes:
        if only and g["slug"] not in only:
            continue
        data = globe_sheet(g, root)
        (dest / f"{g['slug']}.pdf").write_bytes(data)
        done.append((g["slug"], len(data)))
    for slug, (_, make) in EXTRAS.items():
        if only and slug not in only:
            continue
        data = make()
        (dest / f"{slug}.pdf").write_bytes(data)
        done.append((slug, len(data)))
    return done


def main(argv: list[str]) -> int:
    if "--list" in argv:
        globes, refused = plan()
        for g in globes:
            print(f"{g['slug']:16} {g['file']:44} {g['licence_short']}")
        for r in refused:
            print(f"REFUSED {r['id']}: {r['why']}")
        print(f"{len(globes)} globes, {len(EXTRAS)} extras, {len(refused)} refused")
        return 0
    if "--out" not in argv or argv.index("--out") + 1 >= len(argv):
        print("paper_models.py: --out DIR (or --list)", file=sys.stderr)
        return 2
    out = Path(argv[argv.index("--out") + 1])
    only = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None
    if not have_pillow():
        print("paper_models.py: Pillow and numpy are not importable, so only the wheel and the strip are made", file=sys.stderr)
    done = write_all(out, only)
    print(f"paper_models.py: {len(done)} sheets to {out / 'print'} ({sum(b for _, b in done) / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
