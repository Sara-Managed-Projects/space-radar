#!/usr/bin/env python3
"""The repository's social preview: assets/social-preview.png (1280 x 640) and a 1200 x 630 copy.

    python3 scripts/build_social_preview.py            # write both
    python3 scripts/build_social_preview.py --check    # the files exist, have the right size, are under 1 MB

GitHub shows this picture when a link to the repository is pasted in a chat, a feed or a forum. It
is uploaded by hand in the repository's Settings (the API has no call for it); this script only
makes the file, from a picture that is already in the repository (assets/screenshots/hero.webp),
the site's own typeface (site/fonts, through scripts/build_trip_og.py's face()) and the mark drawn
as the site's icon draws it. GitHub asks for a PNG or JPG under 1 MB, 1280 x 640 shows best and
640 x 320 is the smallest; the words keep a 40 px margin so a crop does not cut them.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
OUT = ROOT / "assets" / "social-preview.png"
OUT_OG = ROOT / "assets" / "social-preview-1200x630.png"
HERO = ROOT / "assets" / "screenshots" / "hero.webp"
LIMIT = 1_000_000
SPACE, FG, DIM, ACCENT = (0x0B, 0x0E, 0x14), (0xE8, 0xEC, 0xF2), (0x9A, 0xA4, 0xB2), (0xFF, 0x9F, 0x43)
LINES = ["A live 3D map of space.", "Free. Open source.", "No account."]


def mark(size: int):
    """The mark (templates/press/space-radar-mark.svg, simplified as the site's icon is): a world, its night side, the orbit's arc and the satellite."""
    from PIL import Image, ImageDraw
    k = 4                                   # draw large, shrink: smooth edges without a vector library
    s = size * k
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    g = ImageDraw.Draw(im)
    c, r = s / 2, s * 206 / 1024
    g.ellipse([c - r, c - r, c + r, c + r], fill=(0x2E, 0x6F, 0xB8, 255))
    night = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(night).ellipse([s * (619 - 235) / 1024, s * (574 - 235) / 1024, s * (619 + 235) / 1024, s * (574 + 235) / 1024], fill=(0x12, 0x32, 0x55, 255))
    clip = Image.new("L", (s, s), 0)
    ImageDraw.Draw(clip).ellipse([c - r, c - r, c + r, c + r], fill=255)
    im.paste(night, (0, 0), clip)
    g.ellipse([c - r, c - r, c + r, c + r], outline=(0x6E, 0xC3, 0xFF, 153), width=max(1, round(s * 7 / 1024)))
    ro = s * 354 / 1024                     # the orbit's radius in the icon (22.25 / 64 of the box, scaled to the mark)
    g.arc([c - ro, c - ro, c + ro, c + ro], 170, 320, fill=ACCENT + (255,), width=round(s * 30 / 1024))
    import math
    x, y = c + ro * math.cos(math.radians(320)), c + ro * math.sin(math.radians(320))
    d = s * 66 / 1024
    g.ellipse([x - d, y - d, x + d, y + d], fill=ACCENT + (255,))
    return im.resize((size, size), Image.LANCZOS)


def compose(w: int, h: int):
    from PIL import Image, ImageDraw
    from build_trip_og import face
    im = Image.new("RGB", (w, h), SPACE)
    hero = Image.open(HERO).convert("RGB")
    # The Earth with its satellites is the right-hand half of the hero, above the time bar.
    side = round(hero.height * 0.86)
    left, top = round(hero.width * 0.375), round(hero.height * 0.03)
    crop = hero.crop((left, top, left + side, top + side)).resize((h, h), Image.LANCZOS)
    im.paste(crop, (w - h, 0))
    # A soft fade from the flat background into the picture, so the words never sit on stars.
    fade = Image.new("L", (h, h), 0)
    fg = ImageDraw.Draw(fade)
    for x in range(h // 3):
        fg.line([(x, 0), (x, h)], fill=round(255 * (1 - x / (h // 3)) ** 1.5))
    im.paste(Image.new("RGB", (h, h), SPACE), (w - h, 0), fade)
    g = ImageDraw.Draw(im)
    margin = 40
    unit = h / 640
    m = round(72 * unit)
    im.paste(mark(m), (margin, margin), mark(m))
    name, _ = face("barlow-semi-condensed-600-latin.woff2", round(34 * unit))
    g.text((margin + m + 16, margin + m / 2), "Space Radar", font=name, fill=FG, anchor="lm")
    big, _ = face("inter-600-latin.woff2", round(52 * unit))
    y = round(h * 0.40)
    for line in LINES:
        g.text((margin, y), line, font=big, fill=FG, anchor="ls")
        y += round(66 * unit)
    small, _ = face("inter-400-latin.woff2", round(22 * unit))
    g.text((margin, y + round(8 * unit)), "Runs in a browser, works offline in a classroom.", font=small, fill=DIM, anchor="ls")
    url, _ = face("inter-600-latin.woff2", round(30 * unit))
    g.text((margin, h - margin), "spaceradar.ai", font=url, fill=ACCENT, anchor="ls")
    return im


def write() -> int:
    for path, (w, h) in ((OUT, (1280, 640)), (OUT_OG, (1200, 630))):
        im = compose(w, h)
        im.save(path, optimize=True)
        if path.stat().st_size >= LIMIT:
            im = im.quantize(256, method=2)
            im.save(path, optimize=True)
        print(f"wrote {path.relative_to(ROOT)} {w}x{h} {path.stat().st_size} B")
    return 0


def check() -> int:
    from PIL import Image
    bad = []
    for path, size in ((OUT, (1280, 640)), (OUT_OG, (1200, 630))):
        if not path.is_file():
            bad.append(f"{path.relative_to(ROOT)} is missing: run python3 scripts/build_social_preview.py")
            continue
        if Image.open(path).size != size:
            bad.append(f"{path.relative_to(ROOT)} is not {size[0]}x{size[1]}")
        if path.stat().st_size >= LIMIT:
            bad.append(f"{path.relative_to(ROOT)} is {path.stat().st_size} B; GitHub takes under 1 MB")
    print("\n".join(bad) if bad else "social preview ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else write())
